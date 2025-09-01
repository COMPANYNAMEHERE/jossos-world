import { render, screen } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';

test('renders landing page heading', () => {
  render(
    <HashRouter>
      <App />
    </HashRouter>
  );
  const heading = screen.getByText(/jossos world/i);
  expect(heading).toBeInTheDocument();
});
