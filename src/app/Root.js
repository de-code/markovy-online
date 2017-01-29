import React from 'react';

import AppThemeProvider from './AppThemeProvider';

import { Main } from '../scenes';

const Root = props => (
  <AppThemeProvider>
    <Main/>
  </AppThemeProvider>
);

export default Root;
