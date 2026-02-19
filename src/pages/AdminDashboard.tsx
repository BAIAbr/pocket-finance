import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Loader2, Users, Clock, Activity, TrendingUp, TrendingDown, Download, ArrowLeft, Search, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AdminAchievements from '@/components/AdminAchievements';

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

interface ProfileRow {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminCheck(user?.id);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin || adminLoading) return;

    const fetchData = async () => {
      const [analyticsRes, sessionsRes, profilesRes] = await Promise.all([
        supabase.from('user_analytics').select('*'),
        supabase
          .from('user_sessions')
          .select('user_id, login_at, duration_minutes')
          .gte('login_at', subDays(new Date(), 30).toISOString())
          .order('login_at', { ascending: true }),
        supabase.from('profiles').select('user_id, name, email, created_at'),
      ]);

      if (analyticsRes.data) setAnalytics(analyticsRes.data as AnalyticsRow[]);
      if (sessionsRes.data) setSessions(sessionsRes.data as SessionRow[]);
      if (profilesRes.data) setProfiles(profilesRes.data as ProfileRow[]);
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

  const formatDateBR = (isoString: string | null) => {
    if (!isoString) return { data: '', horario: '' };
    const date = parseISO(isoString);
    // Convert to Brazil timezone (UTC-3)
    const brDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    return {
      data: format(brDate, 'dd/MM/yyyy', { locale: ptBR }),
      horario: format(brDate, 'HH:mm:ss'),
    };
  };

  const formatMinutes = (minutes: number) => {
    const hrs = Math.floor(Number(minutes) / 60);
    const mins = Math.round(Number(minutes) % 60);
    if (hrs > 0) return `${hrs}h ${mins}min`;
    return `${mins}min`;
  };

  const exportCSV = () => {
    const header = 'Nome,Email,Último Login (Data),Último Login (Horário),Tempo Total no Site,Total de Sessões,Tempo Médio por Sessão,Status,Data de Cadastro\n';
    const rows = analytics.map(a => {
      const profile = profiles.find(p => p.user_id === a.user_id);
      const nome = profile?.name || '';
      const email = profile?.email || '';
      const { data: loginData, horario: loginHorario } = formatDateBR(a.last_login_at);
      const tempoTotal = formatMinutes(a.total_time_online);
      const tempoMedio = formatMinutes(a.average_session_time);
      const statusMap: Record<string, string> = { ativo: 'Ativo', em_risco: 'Em risco', inativo: 'Inativo' };
      const status = statusMap[a.status_usuario] || a.status_usuario;
      const { data: cadastroData } = formatDateBR(a.created_at);
      return `"${nome}","${email}",${loginData},${loginHorario},"${tempoTotal}",${a.total_sessions},"${tempoMedio}",${status},${cadastroData}`;
    }).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
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
            <p className="text-sm text-muted-foreground">Gerenciamento completo</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download size={16} />
          CSV
        </Button>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics" className="gap-1.5">
            <Activity size={14} />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-1.5">
            <Trophy size={14} />
            Conquistas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">

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

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users size={16} />
            Lista de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'ativo', 'inativo'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                  className="text-xs"
                >
                  {filter === 'all' ? 'Todos' : filter === 'ativo' ? 'Ativos' : 'Inativos'}
                </Button>
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última atividade</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles
                .filter((profile) => {
                  const q = searchQuery.toLowerCase();
                  const matchesSearch = !q || profile.name?.toLowerCase().includes(q) || profile.email.toLowerCase().includes(q);
                  if (!matchesSearch) return false;
                  if (statusFilter === 'all') return true;
                  const userAnalytics = analytics.find(a => a.user_id === profile.user_id);
                  const lastActivity = userAnalytics?.last_login_at ? parseISO(userAnalytics.last_login_at) : null;
                  const isActive = lastActivity ? isAfter(lastActivity, subDays(new Date(), 30)) : false;
                  return statusFilter === 'ativo' ? isActive : !isActive;
                })
                .map((profile) => {
                  const userAnalytics = analytics.find(a => a.user_id === profile.user_id);
                  const lastActivity = userAnalytics?.last_login_at ? parseISO(userAnalytics.last_login_at) : null;
                  const isActive = lastActivity ? isAfter(lastActivity, subDays(new Date(), 30)) : false;

                  return (
                    <TableRow key={profile.user_id}>
                      <TableCell className="font-medium">
                        {profile.name || profile.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {profile.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'default' : 'destructive'} className="text-xs">
                          {isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lastActivity
                          ? format(lastActivity, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(parseISO(profile.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Usuários ativos por dia (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyActiveData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />
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
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />
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
        </TabsContent>

        <TabsContent value="achievements">
          <AdminAchievements />
        </TabsContent>
      </Tabs>
    </div>
  );
}
