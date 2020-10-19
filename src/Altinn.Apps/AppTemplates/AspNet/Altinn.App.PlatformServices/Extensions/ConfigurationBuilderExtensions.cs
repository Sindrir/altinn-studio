using System.IO;
using Microsoft.Extensions.Configuration;


namespace Altinn.App.PlatformServices.Extensions
{
    public static class ConfigurationBuilderExtensions
    {
        public static void LoadAppConfig(this IConfigurationBuilder builder)
        {
            string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;

            if (basePath == "/")
            {
                // docker container config
                builder.AddEnvironmentVariables();

                builder.SetBasePath(basePath);
                builder.AddJsonFile(basePath + @"altinn-appsettings-secret/altinn-appsettings-secret.json", true, true);
            }
            else
            {
                // local config
                builder.AddJsonFile(Directory.GetCurrentDirectory() + @"/appsettings.json", true, true);
            }
        }

    }
}