// import { useEffect, useState } from 'react';
import { createMuiTheme, createStyles, Grid, Hidden, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import Select from 'react-select';
import { AltinnButton } from '../../../../../shared/src/components/AltinnButton';
import { AltinnIcon } from '../../../../../shared/src/components/AltinnIcon';
import { AltinnLink } from '../../../../../shared/src/components/AltinnLink';
import AltinnSpinner from '../../../../../shared/src/components/AltinnSpinner';
import AltinnPopoverSimple from '../../../../../shared/src/components/molecules/AltinnPopoverSimple';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getValueByPath } from '../../../../../shared/src/utils/getValueByPath';
import { getLanguageFromKey, getParsedLanguageFromKey } from '../../../../../shared/src/utils/language';
import { IEnvironmentItem } from '../../../sharedResources/appCluster/appClusterReducer';
import AppDeploymentActions from '../../../sharedResources/appDeployment/appDeploymentDispatcher';
import { ICreateAppDeploymentErrors } from '../../../sharedResources/appDeployment/appDeploymentReducer';
import { ICreateAppDeploymentEnvObject } from '../../../sharedResources/appDeployment/create/createAppDeploymentActions';
import { getAzureDevopsBuildResultUrl } from './../../../utils/urlHelper';

export interface IReceiptContainerProps {
  envName: string;
  envObj: ICreateAppDeploymentEnvObject;
  deploymentList?: IEnvironmentItem;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
  deployError?: ICreateAppDeploymentErrors[];
  deployHistory?: any;
  releases?: any[];
  language: any;
}

const theme = createMuiTheme(altinnTheme);

const useStyles = makeStyles(() =>
  createStyles({
    mainContainer: {

    },
    headingContainer: {
      borderTop: '2px solid #000000',
      borderBottom: '2px solid #C9C9C9',
      marginTop: '2rem',
      marginBottom: '3.6rem',
      paddingLeft: '5rem',
      paddingRight: '5rem',
      paddingTop: '2rem',
      paddingBottom: '2rem',
      width: '100%',
    },
    dropdownGrid: {
      paddingBottom: '5rem',
      paddingRight: '6rem',
      paddingLeft: '5rem',
    },
    select: {
      maxWidth: '34rem',
    },
    gridItem: {
      paddingRight: '2rem',
    },
    gridBorder: {
      border: '1px solid black',
    },
    gridEnvTitle: {
      maxWidth: '22.5rem',
      paddingRight: '0.5rem',
    },
    envTitle: {
      fontSize: 18,
      fontWeight: 500,
    },
    table: {
      backgroundColor: '#ffffff',
      [theme.breakpoints.up('xs')]: {
        minWidth: '30rem',
      },
      [theme.breakpoints.up('lg')]: {
        minWidth: '56rem',
      },
    },
    colorBlack: {
      color: '#000',
    },
    tableRow: {
      height: '2.6rem',
    },
    tableWrapper: {
      maxHeight: 350,
      overflow: 'auto',
    },
    deployButton: {
      marginTop: '2.6rem',
    },
    deployStatusGridContainer: {
      marginTop: '2.6rem',
    },
    deploySpinnerGridItem: {
      minWidth: '4.4rem',
    },
    deploymentListGrid: {
      paddingLeft: '4.8rem',
    },
    deployUnavailableContainer: {
      backgroundColor: theme.altinnPalette.primary.redLight,
      padding: '1.2rem',
    },
    paperProps: {
      backgroundColor: '#F9CAD3',
    },
    typographyTekniskFeilkode: {
      paddingTop: '1.2rem',
    },
  }),
);

const AppDeploymentComponent = (props: IReceiptContainerProps) => {
  const classes = useStyles(props);

  const [selectedImageTag, setSelectedImageTag] = React.useState(null);
  const [deployInProgress, setDeployInProgress] = React.useState(null);
  const [deployButtonDisabled, setDeployButtonDisabled] = React.useState(true);
  const [succeededDeployHistory, setSucceededDeployHistory] = React.useState([]);
  const [shouldDisplayDeployStatus, setShouldDisplayDeployStatus] = React.useState(false);
  const [deploymentStatus, setDeploymentStatus] = React.useState(null);

  const [anchorEl, setAnchorEl] = React.useState(null);

  interface IPopoverState  {
    btnConfirmText: string;
    btnMethod: () => void;
    btnCancelText: string;
    children: any;
    anchorOrigin: any;
    transformOrigin: any;
    paperProps: any;
  }

  const initialPopoverState: IPopoverState = {
    btnConfirmText: '',
    btnMethod: null,
    btnCancelText: '',
    children: null,
    anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
    transformOrigin: { horizontal: 'left', vertical: 'bottom' },
    paperProps: {},
  };

  const [popoverState, setPopoverState] = React.useState<IPopoverState>(initialPopoverState);
  const [deployButtonHasShownError, setDeployButtonHasShownError] = React.useState(null);

  const deployButtonRef = React.createRef<HTMLInputElement>();

  const {
    deployError, deployHistory, deploymentList, envName, envObj, language, releases, urlToApp, urlToAppLinkTxt,
  } = props;

  const appDeployedVersion = deploymentList && deploymentList.items && deploymentList.items.length > 0 ?
    deploymentList.items[0].spec.template.spec.containers[0].image.split(':')[1] : undefined;

  // TODO: SHared enum with releases.
  enum deploymentStatusEnum {
    canceled = 'canceled',
    failed = 'failed',
    inProgress = 'inProgress',
    none = 'none',
    partiallySucceeded = 'partiallySucceeded',
    succeeded = 'succeeded',
  }

  const doSetSelectedImageTag = (event: any) => {
    if (getValueByPath(event, 'value', null) !== null) {
      setSelectedImageTag(event.value);
    } else {
      setSelectedImageTag(null);
    }
  };

  const startDeploy = () => {
    setDeployInProgress(true);
    setDeployButtonHasShownError(false);
    AppDeploymentActions.createAppDeployment(selectedImageTag, envObj);
  };

  React.useEffect(() => {
    if (selectedImageTag === null || deployInProgress === true) {
      setDeployButtonDisabled(true);
    } else {
      setDeployButtonDisabled(false);
    }
  }, [selectedImageTag, deployInProgress]);

  React.useEffect(() => {
    if (deployHistory && deployHistory[0] && deployHistory[0].build.finished === null) {
      setDeployInProgress(true);
      setDeploymentStatus(deploymentStatusEnum.inProgress);
    } else if (deployHistory && deployHistory[0] && deployHistory[0].build.finished && deployHistory[0].build.result) {
      setDeployInProgress(false);
      setDeploymentStatus(deployHistory[0].build.result);
    } else {
      setDeployInProgress(false);
      setDeploymentStatus(null);
    }

    setSucceededDeployHistory(deployHistory.filter((deployment: any) =>
      deployment.build.result === deploymentStatusEnum.succeeded && deployment.build.finished !== null));

    if (deployHistory && deployHistory[0] && deployHistory[0].created) {
      const now = moment();
      const deployCreatedPlusOneHour = moment(new Date(deployHistory[0].created)).add(60, 'm');
      now < deployCreatedPlusOneHour ? setShouldDisplayDeployStatus(true) : setShouldDisplayDeployStatus(false);
    }

    if (deployButtonHasShownError !== true && deployError && deployError[0] && deployError[0].errorMessage !== null) {
      deployFailedPopover('Create deployment failed');
    }

  }, [deployHistory]);

  const deployButtonConfirmationPopover = (event: any) => {
    setPopoverState({
      ...popoverState,
      children: (
        <Typography>
          {getParsedLanguageFromKey('app_deploy_messages.deploy_confirmation', language, [
                    selectedImageTag,
                    appDeployedVersion,
                  ],
          )}
        </Typography>
        ),
      btnMethod: handleDeployButtonConfirmation,
      btnConfirmText: 'Ja',
      btnCancelText: 'avbryt',
      anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
      transformOrigin: { horizontal: 'left', vertical: 'bottom' },
    });
    setAnchorEl(event.currentTarget);
  };

  const deployFailedPopover = (children: string) => {
    setDeployButtonHasShownError(true);
    setAnchorEl(deployButtonRef.current);
    setPopoverState({
      ...popoverState,
      children: (
        <>
          <Typography>
            {getParsedLanguageFromKey('app_deploy_messages.technical_error_1', language, [])}
          </Typography>
          <div className={classes.typographyTekniskFeilkode}>
            <Typography variant='caption' >
              {getParsedLanguageFromKey('app_deploy_messages.technical_error_code', language, [
                deployError[0].errorCode,
              ])}
            </Typography>
          </div>
        </>
      ),
      anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
      transformOrigin: { horizontal: 'left', vertical: 'top' },
      paperProps: { classes: { root: classes.paperProps } },
    });
  };

  const handleDeployButtonConfirmation = () => {
    startDeploy();
    handleClosePopover();
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setPopoverState(initialPopoverState);
  };

  const selectNoOptionsMessage = () => (
    'Du har ingen versjoner å deploye'
  );

  const returnDeployDropDown = () => (
    <>
      <Typography>
        {getLanguageFromKey('app_deploy_messages.choose_version', language)}
      </Typography>
      <div className={classes.select}>
        <Select
          className='basic-single'
          classNamePrefix='select'
          isClearable={true}
          isSearchable={true}
          name='color'
          options={releases}
          onChange={doSetSelectedImageTag}
          noOptionsMessage={selectNoOptionsMessage}
          placeholder={''}
        />
      </div>
      <div className={classes.deployButton} ref={deployButtonRef}>
        <AltinnButton
          btnText={getLanguageFromKey('app_deploy_messages.btn_deploy_new_version', language)}
          disabled={deployButtonDisabled}
          onClickFunction={deployButtonConfirmationPopover}
        />
        <AltinnPopoverSimple
          classes={{}}
          anchorEl={anchorEl}
          anchorOrigin={popoverState.anchorOrigin}
          btnCancelText={popoverState.btnCancelText}
          btnClick={popoverState.btnMethod}
          btnConfirmText={popoverState.btnConfirmText}
          btnPrimaryId='deployPopover'
          handleClose={handleClosePopover}
          transformOrigin={popoverState.transformOrigin}
          children={popoverState.children}
          paperProps={popoverState.paperProps}
        />
      </div>
      {shouldDisplayDeployStatus &&
        <Grid container={true} className={classes.deployStatusGridContainer} alignItems='center'>
          <Grid item={true} className={classes.deploySpinnerGridItem} xs={1}>
            {deploymentStatus === deploymentStatusEnum.inProgress &&
              <AltinnSpinner/>
            }
            {deploymentStatus === deploymentStatusEnum.succeeded &&
              <AltinnIcon
                iconClass='ai ai-check-circle'
                iconColor={theme.altinnPalette.primary.green}
                iconSize='3.6rem'
              />
            }
            {(deploymentStatus === deploymentStatusEnum.partiallySucceeded ||
              deploymentStatus === deploymentStatusEnum.none) &&
              <AltinnIcon
                iconClass='ai ai-info-circle'
                iconColor={theme.altinnPalette.primary.blueMedium}
                iconSize='3.6rem'
              />
            }
            {(deploymentStatus === deploymentStatusEnum.canceled ||
              deploymentStatus === deploymentStatusEnum.failed) &&
              <AltinnIcon
                iconClass='ai ai-circle-exclamation'
                iconColor={theme.altinnPalette.primary.red}
                iconSize='3.6rem'
              />
            }
          </Grid>
          <Grid item={true} xs={true}>
            {deploymentStatus === deploymentStatusEnum.inProgress &&
              <Typography>
                {deployHistory[0].createdBy} deployer versjon {deployHistory[0].tagName}
              </Typography>
            }
            {deploymentStatus === deploymentStatusEnum.succeeded &&
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.success', language, [
                    deployHistory[0].tagName,
                    moment(new Date(deployHistory[0].build.finished)).format('HH:mm'),
                    envName,
                    deployHistory[0].createdBy,
                    getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                  ],
                )}
              </Typography>
            }
            {deploymentStatus === deploymentStatusEnum.failed &&
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.failed', language, [
                    deployHistory[0].tagName,
                    moment(new Date(deployHistory[0].build.finished)).format('HH:mm'),
                    envName,
                    deployHistory[0].createdBy,
                    getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                  ],
                )}
              </Typography>
            }
            {deploymentStatus === deploymentStatusEnum.canceled &&
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.canceled', language, [
                    deployHistory[0].tagName,
                    moment(new Date(deployHistory[0].build.finished)).format('HH:mm'),
                    envName,
                    getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                  ],
                )}

              </Typography>
            }
            {deploymentStatus === deploymentStatusEnum.partiallySucceeded &&
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.partiallySucceeded', language, [
                    deployHistory[0].tagName,
                    envName,
                    moment(new Date(deployHistory[0].build.finished)).format('HH:mm'),
                    getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                  ],
                )}
              </Typography>
            }
            {deploymentStatus === deploymentStatusEnum.none &&
              <Typography>
                {getParsedLanguageFromKey('app_deploy_messages.none', language, [
                    deployHistory[0].tagName,
                    moment(new Date(deployHistory[0].build.finished)).format('HH:mm'),
                    envName,
                    getAzureDevopsBuildResultUrl(deployHistory[0].build.id),
                  ],
                )}
              </Typography>
            }
          </Grid>
        </Grid>
      }
    </>
  );

  const returnDeployUnavailable = () => (
    <>
      <Grid container={true} className={classes.deployUnavailableContainer} alignItems='flex-start'>
        <Grid item={true} className={classes.deploySpinnerGridItem} xs={1}>
          <AltinnIcon
            iconClass='ai ai-circle-exclamation'
            iconColor={theme.altinnPalette.primary.red}
            iconSize='3.6rem'
          />
        </Grid>
        <Grid item={true} xs={true}>
          {/* Huff da, vi opplever en teknisk feil og klarer derfor ikke å tilgjengeliggjøre deploy.
          Vennligst prøv igjen senere. Dersom problemet vedvarer, kontakt Altinn servicedesk. */}
          {getParsedLanguageFromKey('app_deploy_messages.unable_to_list_deploys', language)}
        </Grid>
      </Grid>
    </>
  );

  return (
    <>

        <Grid container={true} className={classes.mainContainer}>
          <Grid container={true} item={true} className={classes.headingContainer}>
            <Grid item={true} className={classes.gridEnvTitle} xs={3}>
              <Typography className={classes.envTitle}>
                {getParsedLanguageFromKey('app_deploy.environment', language, [envName.toUpperCase()])}
              </Typography>
            </Grid>
            <Grid item={true} className={classes.gridItem} xs={3}>
              {deploymentList && deploymentList.getStatus.success === true &&
                appDeployedVersion !== undefined &&
                  <>
                    {getParsedLanguageFromKey('app_deploy.deployed_version', language, [appDeployedVersion])}
                  </>
              }
              {deploymentList && deploymentList.getStatus.success === true &&
                appDeployedVersion === undefined &&
                  <>
                    {getParsedLanguageFromKey('app_deploy.no_app_deployed', language)}
                  </>
              }
              {deploymentList && deploymentList.getStatus.success === false &&
                  <>
                    {getParsedLanguageFromKey('app_deploy.deployed_version_unavailable', language)}
                  </>
              }
            </Grid>
            <Grid item={true} className={classes.gridItem} xs={6}>
              <AltinnLink
                classes={{}}
                url={urlToApp}
                linkTxt={urlToAppLinkTxt}
                shouldShowIcon={false}
                openInNewTab={true}
              />
            </Grid>
          </Grid>

          <Grid item={true} xs={7} lg={5} className={classNames(classes.dropdownGrid)}>
            {deploymentList && deploymentList.getStatus.success === true && returnDeployDropDown()}
            {deploymentList && deploymentList.getStatus.success === false && returnDeployUnavailable()}

          </Grid>

          <Grid item={true} className={classes.deploymentListGrid}>
            <Typography>
            {getParsedLanguageFromKey('app_deploy_table.deployed_version_history', language, [envName.toUpperCase()])}
            </Typography>
            <div className={classes.tableWrapper}>
              <Table
                stickyHeader={true}
                className={classes.table}
                size='small'
                aria-label={getParsedLanguageFromKey('app_deploy_table.deploy_table_aria', language, [envName], true)}
              >
                <TableHead>
                  <TableRow className={classes.tableRow}>
                    <TableCell className={classes.colorBlack}>
                      <Typography>
                        {getParsedLanguageFromKey('app_deploy_table.version_col', language)}
                      </Typography>
                    </TableCell>
                    <TableCell className={classes.colorBlack}>
                      <Typography>
                        {getParsedLanguageFromKey('app_deploy_table.available_version_col', language)}
                      </Typography>
                    </TableCell>
                    <Hidden mdDown={true}>
                      <TableCell className={classes.colorBlack}>
                        <Typography>
                          {getParsedLanguageFromKey('app_deploy_table.deployed_by_col', language)}
                        </Typography>
                      </TableCell>
                    </Hidden>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {succeededDeployHistory.map((deploy: any, index: number) => (
                    <TableRow key={index} className={classes.tableRow}>
                      <TableCell component='th' scope='row'>
                        <Typography>
                          {deploy.tagName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>
                          {moment(new Date(deploy.build.finished)).format('DD.MM.YY [kl.] HH:mm')}
                        </Typography>
                      </TableCell>
                      <Hidden mdDown={true}>
                        <TableCell>
                          <Typography>
                            {deploy.createdBy}
                          </Typography>
                        </TableCell>
                      </Hidden>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Grid>

        </Grid>
    </>
  );
};

export default AppDeploymentComponent;