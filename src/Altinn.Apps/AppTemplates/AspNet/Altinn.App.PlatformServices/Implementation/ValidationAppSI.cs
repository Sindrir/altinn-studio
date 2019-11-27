using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.App.Service.Interface;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// service validation an complete instance or a specific data element
    /// </summary>
    public class ValidationAppSI : IValidation
    {
        private readonly ILogger _logger;
        private readonly IData _dataService;
        private readonly IAltinnApp _altinnApp;
        private readonly IAppResources _appResourcesService;

        /// <summary>
        /// Initializes a new instance of the <see cref="ValidationAppSI"/> class.
        /// </summary>
        public ValidationAppSI(
            ILogger<ApplicationAppSI> logger,
            IData dataService,
            IAltinnApp altinnApp,
            IAppResources appResourcesService)
        {
            _logger = logger;
            _dataService = dataService;
            _altinnApp = altinnApp;
            _appResourcesService = appResourcesService;
        }

        public async Task<System.Collections.Generic.List<ValidationIssue>> ValidateAndUpdateInstance(Instance instance, string taskId)
        {
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];

            _logger.LogInformation($"Validation of {instance.Id}");

            Application application = _appResourcesService.GetApplication();

            // Todo. Figure out where to get this from
            Dictionary<string, Dictionary<string, string>> serviceText = new Dictionary<string, Dictionary<string, string>>();

            List<ValidationIssue> messages = new List<ValidationIssue>();
            foreach (DataType dataType in application.DataTypes.Where(et => et.TaskId == taskId))
            {
                List<DataElement> elements = instance.Data.Where(d => d.DataType == dataType.Id).ToList();

                if (dataType.MaxCount > 0 && dataType.MaxCount < elements.Count)
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        InstanceId = instance.Id,
                        Code = ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType,                        
                        Severity = ValidationIssueSeverity.Error,
                        Description = ServiceTextHelper.GetServiceText(
                            ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType, serviceText, null, "nb")
                    };
                    messages.Add(message);
                }

                if (dataType.MinCount > 0 && dataType.MinCount > elements.Count)
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        InstanceId = instance.Id,
                        Code = ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType,
                        Severity = ValidationIssueSeverity.Error,
                        Description = ServiceTextHelper.GetServiceText(
                            ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType, null, null, "nb")
                    };
                    messages.Add(message);
                }                

                foreach (DataElement dataElement in elements)
                {
                    messages.AddRange(await ValidateDataElement(instance, dataType, dataElement));
                }
            }

            if (messages.Count == 0)
            {
                instance.Process.CurrentTask.Validated = new ValidationStatus { CanCompleteTask = true, Timestamp = DateTime.Now };
            }
            else
            {
                instance.Process.CurrentTask.Validated = new ValidationStatus { CanCompleteTask = false, Timestamp = DateTime.Now };
            }

            return messages;
        }

        public async Task<List<ValidationIssue>> ValidateDataElement(Instance instance, DataType dataType, DataElement dataElement)
        {
            _logger.LogInformation($"Validation of data element {dataElement.Id} of instance {instance.Id}");

            // Todo. Figure out where to get this from
            Dictionary<string, Dictionary<string, string>> serviceText = new Dictionary<string, Dictionary<string, string>>();

            List<ValidationIssue> messages = new List<ValidationIssue>();

            if (dataElement.ContentType == null)
            {
                ValidationIssue message = new ValidationIssue
                {
                    InstanceId = instance.Id,
                    Code = ValidationIssueCodes.DataElementCodes.MissingContentType,
                    DataElementId = dataElement.Id,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ServiceTextHelper.GetServiceText(
                        ValidationIssueCodes.DataElementCodes.MissingContentType, serviceText, null, "nb")
                };
                messages.Add(message);
            }
            else
            {
                string contentTypeWithoutEncoding = dataElement.ContentType.Split(";")[0];

                if (dataType.AllowedContentTypes.All(ct => !ct.Equals(contentTypeWithoutEncoding, StringComparison.OrdinalIgnoreCase)))
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        InstanceId = instance.Id,
                        DataElementId = dataElement.Id,
                        Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                        Severity = ValidationIssueSeverity.Error,
                        Description = ServiceTextHelper.GetServiceText(
                            ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed, serviceText, null, "nb")
                    };
                    messages.Add(message);
                }
            }

            if (dataType.MaxSize.HasValue && dataType.MaxSize > 0 && (long)dataType.MaxSize * 1024 * 1024 < dataElement.Size)
            {
                ValidationIssue message = new ValidationIssue
                {
                    InstanceId = instance.Id,
                    DataElementId = dataElement.Id,
                    Code = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ServiceTextHelper.GetServiceText(
                        ValidationIssueCodes.DataElementCodes.DataElementTooLarge, serviceText, null, "nb")
                };
                messages.Add(message);
            }

            if (dataType.AppLogic != null)
            {                
                Type modelType = _altinnApp.GetAppModelType(dataType.AppLogic.ClassRef);
                Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
                string app = instance.AppId.Split("/")[0];
                int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                dynamic data = _dataService.GetFormData(instanceGuid, modelType, instance.Org, app, instanceOwnerPartyId, Guid.Parse(dataElement.Id));

                var context = new ValidationContext(data);
                List<System.ComponentModel.DataAnnotations.ValidationResult> validationResults = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
                bool isValid = Validator.TryValidateObject(data, context, validationResults, true);          

                if (!isValid)
                {
                    messages.AddRange(MapModelStateToIssueList(instance, validationResults, dataElement.Id, dataElement.DataType, serviceText));
                }
            }

            return messages;
        }

        private List<ValidationIssue> MapModelStateToIssueList(
            Instance instance,
            List<System.ComponentModel.DataAnnotations.ValidationResult> validationResult,
            string elementId,
            string dataType,
            Dictionary<string, Dictionary<string, string>> serviceText)
        {
            List<ValidationIssue> messages = new List<ValidationIssue>();
            foreach (System.ComponentModel.DataAnnotations.ValidationResult validationIssue in validationResult)
            {               
                if (validationIssue != null)
                {                    
                    ValidationIssue message = new ValidationIssue
                    {
                        InstanceId = instance.Id,
                        DataElementId = elementId,
                        Code = validationIssue.ErrorMessage,                                                
                        Field = string.Join(",", validationIssue.MemberNames),
                        Severity = ValidationIssueSeverity.Error,
                        Description = ServiceTextHelper.GetServiceText(validationIssue.ErrorMessage, serviceText, null, "nb")
                    };
                    messages.Add(message);                    
                }
            }

            return messages;
        }
    }
}