import {StrictMode} from 'react';
import * as ReactDOM from 'react-dom/client';

import {BrowserRouter} from "react-router-dom";
import AppRouter from "./app/AppRouter";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <BrowserRouter>
      {/*<App/>*/}
      <AppRouter/>
    </BrowserRouter>
  </StrictMode>
);
