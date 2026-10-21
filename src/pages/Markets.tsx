// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// /markets and /markets/:slug → Finandex AI "Global Markets" tab (34 assets), optionally focused on one asset.
import { Navigate, useParams } from 'react-router-dom';

export default function Markets() {
  const { slug } = useParams();
  return <Navigate replace to={`/dex/finandex-ai/markets${slug ? `/${encodeURIComponent(slug)}` : ''}`} />;
}
