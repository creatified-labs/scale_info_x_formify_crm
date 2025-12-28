"use client";

import { ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import { useData } from '@/contexts/DataContext';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { revenueEntries, goals } = useData();

  return (
    <Layout revenueEntries={revenueEntries} goals={goals}>
      {children}
    </Layout>
  );
}
