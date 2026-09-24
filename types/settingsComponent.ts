import React from 'react';

export type FC<P = {}> = React.FC<P> & {
  title?: string;
  isAboveOthers?: boolean;
};
