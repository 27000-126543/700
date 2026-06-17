import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';
import type { Province, Alert } from '@shared/types';

export default function MainLayout() {
  const navigate = useNavigate();
  const { user, setProvinces, setUnreadAlerts, provinces } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    initData();
  }, [user, navigate]);

  const initData = async () => {
    try {
      if (provinces.length === 0) {
        const data = await api.get<Province[]>('/provinces');
        setProvinces(data);
      }
    } catch (err) {
      console.error('初始化数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchUnreadAlerts = async () => {
      try {
        const data = await api.get<{ items: Alert[]; total: number }>('/alerts', {
          status: 'pending',
          pageSize: 1,
        });
        setUnreadAlerts(data.total);
      } catch (err) {
        console.error('获取未读预警失败:', err);
      }
    };

    fetchUnreadAlerts();
    const interval = setInterval(fetchUnreadAlerts, 30000);
    return () => clearInterval(interval);
  }, [user, setUnreadAlerts]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">正在加载系统...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
