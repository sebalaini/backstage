/*
 * Copyright 2020 The Backstage Authors
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

import React, { useContext } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { V1Service } from '@kubernetes/client-node';
import { ServiceDrawer } from './ServiceDrawer';
import { GroupedResponsesContext } from '../../hooks';
import { StructuredMetadataTable } from '@backstage/core-components';

type ServiceSummaryProps = {
  service: V1Service;
};

const ServiceSummary = ({ service }: ServiceSummaryProps) => {
  return (
    <Grid
      container
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
      xs={12}
    >
      <Grid xs={8}>
        <ServiceDrawer service={service} />
      </Grid>

      <Grid>
        <Typography variant="subtitle2">
          Type: {service.spec?.type ?? '?'}
        </Typography>
      </Grid>
    </Grid>
  );
};

type ServiceCardProps = {
  service: V1Service;
};

const ServiceCard = ({ service }: ServiceCardProps) => {
  const metadata: any = {};

  if (service.status?.loadBalancer?.ingress?.length ?? -1 > 0) {
    metadata.loadbalancer = service.status?.loadBalancer;
  }

  if (service.spec?.type === 'ClusterIP') {
    metadata.clusterIP = service.spec.clusterIP;
  }
  if (service.spec?.type === 'ExternalName') {
    metadata.externalName = service.spec.externalName;
  }

  return (
    <StructuredMetadataTable
      metadata={{
        type: service.spec?.type,
        ports: service.spec?.ports,
        ...metadata,
      }}
    />
  );
};

/**
 *
 *
 * @public
 */
export type ServicesAccordionsProps = {};

type ServiceAccordionProps = {
  service: V1Service;
};

const ServiceAccordion = ({ service }: ServiceAccordionProps) => {
  return (
    <Accordion
      slotProps={{ transition: { unmountOnExit: true } }}
      variant="outlined"
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <ServiceSummary service={service} />
      </AccordionSummary>
      <AccordionDetails>
        <ServiceCard service={service} />
      </AccordionDetails>
    </Accordion>
  );
};

/**
 *
 *
 * @public
 */
export const ServicesAccordions = ({}: ServicesAccordionsProps) => {
  const groupedResponses = useContext(GroupedResponsesContext);
  return (
    <Grid
      container
      direction="row"
      justifyContent="flex-start"
      alignItems="flex-start"
    >
      {groupedResponses.services.map((service, i) => (
        <Grid key={i} xs={12}>
          <ServiceAccordion service={service} />
        </Grid>
      ))}
    </Grid>
  );
};
