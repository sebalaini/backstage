/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { StructuredMetadataTable } from '@backstage/core-components';
import { ClientContainerStatus } from '@backstage/plugin-kubernetes-common';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { IContainer, IContainerStatus } from 'kubernetes-models/v1';
import { DateTime } from 'luxon';
import React from 'react';

import { useIsPodExecTerminalEnabled } from '../../../hooks';
import { bytesToMiB, formatMillicores } from '../../../utils/resources';
import { PodExecTerminalDialog } from '../../PodExecTerminal/PodExecTerminalDialog';
import { ResourceUtilization } from '../../ResourceUtilization';
import { PodLogsDialog, PodScope } from '../PodLogs';

const getContainerHealthChecks = (
  containerSpec: IContainer,
  containerStatus: IContainerStatus,
): { [key: string]: boolean } => {
  const healthCheck = {
    'not waiting to start': containerStatus.state?.waiting === undefined,
    'no restarts': containerStatus.restartCount === 0,
  };
  if (containerStatus.state?.terminated?.reason === 'Completed') {
    return healthCheck;
  }
  Object.assign(
    healthCheck,
    { started: !!containerStatus.started },
    { ready: containerStatus.ready },
    { 'readiness probe set': containerSpec?.readinessProbe !== undefined },
  );
  if (containerSpec && containerSpec?.livenessProbe !== undefined) {
    Object.assign(healthCheck, {
      'liveness probe set': containerSpec.livenessProbe,
    });
  }
  return healthCheck;
};

const getCurrentState = (containerStatus: IContainerStatus): string => {
  return (
    containerStatus.state?.waiting?.reason ||
    containerStatus.state?.terminated?.reason ||
    (containerStatus.state?.running !== undefined ? 'Running' : 'Unknown')
  );
};

const getStartedAtTime = (
  containerStatus: IContainerStatus,
): string | undefined => {
  return (
    containerStatus.state?.running?.startedAt ||
    containerStatus.state?.terminated?.startedAt
  );
};

interface ContainerDatetimeProps {
  prefix: string;
  dateTime: string;
}

const ContainerDatetime = ({ prefix, dateTime }: ContainerDatetimeProps) => {
  return (
    <Typography variant="subtitle2">
      {prefix}:{' '}
      {DateTime.fromISO(dateTime).toRelative({
        locale: 'en',
      })}
    </Typography>
  );
};

/**
 * Props for ContainerCard
 *
 * @public
 */
export interface ContainerCardProps {
  podScope: PodScope;
  containerSpec?: IContainer;
  containerStatus: IContainerStatus;
  containerMetrics?: ClientContainerStatus;
}

/**
 * Shows details about a container within a pod
 *
 * @public
 */
export const ContainerCard: React.FC<ContainerCardProps> = ({
  podScope,
  containerSpec,
  containerStatus,
  containerMetrics,
}: ContainerCardProps) => {
  const isPodExecTerminalEnabled = useIsPodExecTerminalEnabled();

  // This should never be undefined
  if (containerSpec === undefined) {
    return <Typography>error reading pod from cluster</Typography>;
  }
  const containerStartedTime = getStartedAtTime(containerStatus);
  const containerFinishedTime = containerStatus.state?.terminated?.finishedAt;

  return (
    <Card>
      <CardHeader
        title={containerStatus.name}
        subheader={containerStatus.image}
      />
      <CardContent>
        <Grid container spacing={1}>
          <Grid xs={12}>
            {containerStartedTime && (
              <ContainerDatetime
                prefix="Started"
                dateTime={containerStartedTime}
              />
            )}
            {containerFinishedTime && (
              <ContainerDatetime
                prefix="Completed"
                dateTime={containerFinishedTime}
              />
            )}
            {containerStartedTime && containerFinishedTime && (
              <Typography variant="subtitle2">
                Execution time:{' '}
                {DateTime.fromISO(containerFinishedTime)
                  .diff(DateTime.fromISO(containerStartedTime), [
                    'hours',
                    'minutes',
                    'seconds',
                  ])
                  .toHuman()}
              </Typography>
            )}
          </Grid>
          <Grid xs={12}>
            <Typography variant="subtitle2">
              Status: {getCurrentState(containerStatus)}
            </Typography>
          </Grid>
          {containerStatus.restartCount > 0 && (
            <Grid xs={12}>
              <Typography variant="subtitle2">
                Restarts: {containerStatus.restartCount}
              </Typography>
            </Grid>
          )}
          <Grid xs={12}>
            <Typography variant="subtitle2">Container health</Typography>
          </Grid>
          <Grid xs={12}>
            <StructuredMetadataTable
              metadata={getContainerHealthChecks(
                containerSpec,
                containerStatus,
              )}
            />
          </Grid>
          {containerMetrics && (
            <Grid container xs={12} spacing={0}>
              <Grid xs={12}>
                <Typography variant="subtitle1">
                  Resource utilization
                </Typography>
              </Grid>
              <Grid xs={12} style={{ minHeight: '5rem' }}>
                <ResourceUtilization
                  compressed
                  title="CPU requests"
                  usage={containerMetrics.cpuUsage.currentUsage}
                  total={containerMetrics.cpuUsage.requestTotal}
                  totalFormatted={formatMillicores(
                    containerMetrics.cpuUsage.requestTotal,
                  )}
                />
                <ResourceUtilization
                  compressed
                  title="CPU limits"
                  usage={containerMetrics.cpuUsage.currentUsage}
                  total={containerMetrics.cpuUsage.limitTotal}
                  totalFormatted={formatMillicores(
                    containerMetrics.cpuUsage.limitTotal,
                  )}
                />
                <ResourceUtilization
                  compressed
                  title="Memory requests"
                  usage={containerMetrics.memoryUsage.currentUsage}
                  total={containerMetrics.memoryUsage.requestTotal}
                  totalFormatted={bytesToMiB(
                    containerMetrics.memoryUsage.requestTotal,
                  )}
                />
                <ResourceUtilization
                  compressed
                  title="Memory limits"
                  usage={containerMetrics.memoryUsage.currentUsage}
                  total={containerMetrics.memoryUsage.limitTotal}
                  totalFormatted={bytesToMiB(
                    containerMetrics.memoryUsage.limitTotal,
                  )}
                />
              </Grid>
            </Grid>
          )}
        </Grid>
      </CardContent>
      <CardActions>
        <PodLogsDialog
          containerScope={{
            containerName: containerStatus.name,
            ...podScope,
          }}
        />
        {isPodExecTerminalEnabled && (
          <PodExecTerminalDialog
            cluster={podScope.cluster}
            containerName={containerStatus.name}
            podName={podScope.podName}
            podNamespace={podScope.podNamespace}
          />
        )}
      </CardActions>
    </Card>
  );
};
