import { createBrowserRouter } from 'react-router-dom';
import { VideoPlayerPage } from '@/features/video/VideoPlayerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <VideoPlayerPage />,
  },
]);
