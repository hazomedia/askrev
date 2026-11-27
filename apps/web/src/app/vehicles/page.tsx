import { redirect } from 'next/navigation';

/**
 * ASKR EV Vehicles Catalog Redirect
 * Reuses the existing official showroom reservation & fleet catalog route (/book).
 */
export default function VehiclesPage() {
  redirect('/book');
}
