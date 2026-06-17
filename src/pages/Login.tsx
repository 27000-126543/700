import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Eye, EyeOff, Shield, Building2, UserCircle, UserCheck, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const roleOptions = [
  { value: 'national', label: '国家级管理员', icon: Shield, color: 'text-accent-purple' },
  { value: 'province', label: '省级管理员', icon: Building2, color: 'text-accent-info' },
  { value: 'unit', label: '单位管理员', icon: UserCheck, color: 'text-accent-safe' },
  { value: 'lab', label: '实验员', icon: UserCircle, color: 'text-accent-gold' },
];

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAppStore();
  const [formData, setFormData] = useState({
    username: 'admin',
    password: 'admin123',
    role: 'national',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await api.post<{ token: string; user: any }>('/auth/login', formData);
      setToken(data.token);
      setUser(data.user);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(42,58,92,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(42,58,92,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative w-full max-w-5xl flex rounded-2xl shadow-2xl overflow-hidden">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-800 via-primary-900 to-surface p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-20 w-40 h-40 rounded-full bg-primary-500 blur-3xl" />
            <div className="absolute bottom-20 right-20 w-60 h-60 rounded-full bg-accent-info blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow">
                <FlaskConical className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">危化品安全监测</h1>
                <p className="text-primary-200 text-sm">全国应急调度分析平台</p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-white leading-tight">
                全生命周期
                <br />
                <span className="bg-gradient-to-r from-primary-300 to-accent-info bg-clip-text text-transparent">
                  安全管控体系
                </span>
              </h2>
              <p className="text-primary-200/80 text-lg leading-relaxed max-w-md">
                实时接入全国实验室危化品数据，智能预警、快速响应、科学调度，
                筑牢实验室安全防线。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-12">
              {[
                { label: '接入实验室', value: '12,847+' },
                { label: '监测危化品', value: '256种' },
                { label: '实时传感器', value: '58,000+' },
                { label: '年处理预警', value: '3.2万次' },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10"
                >
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-primary-200/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 bg-surface-card p-8 lg:p-12">
          <div className="max-w-md mx-auto">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">危化品监测平台</h1>
                <p className="text-xs text-slate-400">全国安全调度分析系统</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">欢迎回来</h2>
            <p className="text-slate-400 mb-8">请登录您的账户以继续</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  选择角色
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {roleOptions.map((role) => {
                    const Icon = role.icon;
                    const isSelected = formData.role === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: role.value })}
                        className={cn(
                          'flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left',
                          isSelected
                            ? 'border-primary-500 bg-primary-700/30 text-white'
                            : 'border-surface-border bg-surface-light/50 text-slate-300 hover:border-primary-700',
                        )}
                      >
                        <Icon className={cn('w-5 h-5', isSelected ? role.color : 'text-slate-500')} />
                        <span className="text-sm font-medium">{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input-field"
                  placeholder="请输入用户名"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field pr-12"
                    placeholder="请输入密码"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full btn-primary py-3 text-base',
                  loading ? 'opacity-70 cursor-wait' : '',
                )}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    登录中...
                  </span>
                ) : (
                  '登 录'
                )}
              </button>
            </form>

            <div className="mt-8 p-4 rounded-xl bg-surface-light/50 border border-surface-border">
              <div className="text-xs text-slate-400">
                <p className="font-medium text-slate-300 mb-1">演示账号：</p>
                <p>用户名：admin / 密码：admin123</p>
                <p className="mt-1">可选择不同角色体验不同权限</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
