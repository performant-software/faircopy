import { createTheme } from "@material-ui/core";

const theme = createTheme({
  palette: {
    primary: {
      main: '#43639D',
      dark: '#283B5E',
    },
    error: {
      main: '#f44336',
      dark: '#c00f0c',
    },
    info: {
      main: '#1976d2',
      dark: '#01579B',
    },
    success: {
      main: '#388e3c',
      dark: '#1B5E20',
    }
  },
});

export default theme;
