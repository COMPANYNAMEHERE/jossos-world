import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing page heading', () => {
  render(<App />);
  const heading = screen.getByText(/jossos world/i);
  expect(heading).toBeInTheDocument();
});

