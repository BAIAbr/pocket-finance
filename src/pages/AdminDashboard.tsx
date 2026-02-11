import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Loader2, Users, Clock, Activity, TrendingUp, TrendingDown, Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalyticsRow {
  user_id: string;
  last_login_at: string | null;
  total_time_online: number;
  total_sessions: number;
  average_session_time: number;
  status_usuario: string;
  created_at: string;
}

interface SessionRow {
  user_id: string;
  login_at: string;
  duration_minutes: number;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminCheck(user?.id);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin || adminLoading) return;

    const fetchData = async () => {
      const [analyticsRes, sessionsRes] = await Promise.all([
        supabase.from('user_analytics').select('*'),
        supabase
          .from('user_sessions')
          .select('user_id, login_at, duration_minutes')
          .gte('login_at', subDays(new Date(), 30).toISOString())
          .order('login_at', { ascending: true }),
      ]);

      if (analyticsRes.data) setAnalytics(analyticsRes.data as AnalyticsRow[]);
      if (sessionsRes.data) setSessions(sessionsRes.data as SessionRow[]);
      setLoading(false);
    };

    fetchData();
  }, [isAdmin, adminLoading]);

  const stats = useMemo(() => {
    const now = new Date();
    const totalUsers = analytics.length;
    const today = format(now, 'yyyy-MM-dd');

    const activeToday = sessions.filter(s => format(parseISO(s.login_at), 'yyyy-MM-dd') === today)
      .map(s => s.user_id)
      .filter((v, i, a) => a.indexOf(v) === i).length;

    const active7d = analytics.filter(a => a.last_login_at && isAfter(parseISO(a.last_login_at), subDays(now, 7))).length;
    const active30d = analytics.filter(a => a.last_login_at && isAfter(parseISO(a.last_login_at), subDays(now, 30))).length;

    const avgTime = totalUsers > 0
      ? Math.round(analytics.reduce((sum, a) => sum + Number(a.average_session_time), 0) / totalUsers * 100) / 100
      : 0;
    const avgSessions = totalUsers > 0
      ? Math.round(analytics.reduce((sum, a) => sum + a.total_sessions, 0) / totalUsers * 10) / 10
      : 0;

    const statusCounts = {
      ativo: analytics.filter(a => a.status_usuario === 'ativo').length,
      em_risco: analytics.filter(a => a.status_usuario === 'em_risco').length,
      inativo: analytics.filter(a => a.status_usuario === 'inativo').length,
    };

    return { totalUsers, activeToday, active7d, active30d, avgTime, avgSessions, statusCounts };
  }, [analytics, sessions]);

  // Chart: active users per day (last 30 days)
  const dailyActiveData = useMemo(() => {
    const days: { date: string; usuarios: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const label = format(subDays(new Date(), i), 'dd/MM', { locale: ptBR });
      const uniqueUsers = sessions
        .filter(s => format(parseISO(s.login_at), 'yyyy-MM-dd') === day)
        .map(s => s.user_id)
        .filter((v, i, a) => a.indexOf(v) === i).length;
      days.push({ date: label, usuarios: uniqueUsers });
    }
    return days;
  }, [sessions]);

  // Chart: average usage time per day
  const dailyAvgTimeData = useMemo(() => {
    const days: { date: string; minutos: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const label = format(subDays(new Date(), i), 'dd/MM', { locale: ptBR });
      const daySessions = sessions.filter(s => format(parseISO(s.login_at), 'yyyy-MM-dd') === day);
      const avg = daySessions.length > 0
        ? Math.round(daySessions.reduce((sum, s) => sum + Number(s.duration_minutes), 0) / daySessions.length * 10) / 10
        : 0;
      days.push({ date: label, minutos: avg });
    }
    return days;
  }, [sessions]);

  const exportCSV = () => {
    const header = 'user_id,last_login_at,total_time_online,total_sessions,average_session_time,status_usuario,created_at\n';
    const rows = analytics.map(a =>
      `${a.user_id},${a.last_login_at || ''},${a.total_time_online},${a.total_sessions},${a.average_session_time},${a.status_usuario},${a.created_at}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finango-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate retention trend (compare this week vs last week active users)
  const thisWeek = stats.active7d;
  const lastWeekUsers = analytics.filter(a => {
    if (!a.last_login_at) return false;
    const d = parseISO(a.last_login_at);
    return isAfter(d, subDays(new Date(), 14)) && !isAfter(d, subDays(new Date(), 7));
  }).length;
  const retentionTrend = lastWeekUsers > 0 ? Math.round(((thisWeek - lastWeekUsers) / lastWeekUsers) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 pb-28 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
            <p className="text-sm text-muted-foreground">Analytics de engajamento</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download size={16} />
          CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users size={14} />
              Total cadastrados
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Activity size={14} />
              Ativos hoje
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.activeToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Activity size={14} />
              Últimos 7 dias
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.active7d}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Activity size={14} />
              Últimos 30 dias
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.active30d}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock size={14} />
              Tempo médio/sessão
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.avgTime}<span className="text-sm font-normal text-muted-foreground"> min</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp size={14} />
              Média sessões/usuário
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.avgSessions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Retention Trend */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Tendência de retenção (7d vs anterior)</p>
            <p className="text-lg font-bold text-foreground">{retentionTrend > 0 ? '+' : ''}{retentionTrend}%</p>
          </div>
          {retentionTrend >= 0 ? (
            <TrendingUp size={28} className="text-primary" />
          ) : (
            <TrendingDown size={28} className="text-destructive" />
          )}
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status dos Usuários</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-foreground">🟢 Ativos: {stats.statusCounts.ativo}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-foreground">🟡 Em risco: {stats.statusCounts.em_risco}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-sm text-foreground">🔴 Inativos: {stats.statusCounts.inativo}</span>
          </div>
        </CardContent>
      </Card>

      {/* Chart: Active users per day */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Usuários ativos por dia (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyActiveData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="usuarios" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart: Average usage time per day */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tempo médio de uso diário (min)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyAvgTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" interval={4} />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line type="monotone" dataKey="minutos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
