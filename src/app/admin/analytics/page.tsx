'use client';

import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { useAdmin } from '@/hooks/use-admin';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Terminal, MessageCircleQuestion, FileText, Users, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface QueryLog {
    id: string;
    query: string;
    responseType: 'answer' | 'clarification' | 'error';
    answerFound: boolean;
    citations: string[];
    userId: string;
    timestamp: Timestamp | null;
}

interface UserProfile {
    id: string;
    email: string;
}

interface DocumentData {
    id: string;
    title: string;
    content: string;
}

function AnalyticsSkeleton() {
    return (
        <div className="space-y-6">
            <h1 className="text-lg font-semibold md:text-2xl">Analytics</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
                    <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
                </Card>
                <Card>
                    <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
                    <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
                </Card>
            </div>
        </div>
    );
}

function AccessDenied() {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
                You do not have permission to view this page.
            </AlertDescription>
        </Alert>
    );
}

/**
 * Custom hook to aggregate userQueries across all users.
 * Uses existing Firestore rules: admins can list users and read each user's userQueries.
 */
function useAggregatedQueries() {
    const firestore = useFirestore();
    const [queryLogs, setQueryLogs] = useState<QueryLog[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchAll = useCallback(async () => {
        if (!firestore) return;
        setIsLoading(true);
        setError(null);
        try {
            // 1. Get all users (admins can list)
            const usersSnap = await getDocs(collection(firestore, 'users'));

            // 2. For each user, fetch their userQueries
            const allLogs: QueryLog[] = [];
            await Promise.all(
                usersSnap.docs.map(async (userDoc) => {
                    try {
                        const queriesSnap = await getDocs(
                            collection(firestore, 'users', userDoc.id, 'userQueries')
                        );
                        queriesSnap.docs.forEach((qDoc) => {
                            const data = qDoc.data();
                            if (data.query && data.responseType) {
                                allLogs.push({
                                    id: qDoc.id,
                                    query: data.query,
                                    responseType: data.responseType,
                                    answerFound: data.answerFound ?? false,
                                    citations: data.citations ?? [],
                                    userId: data.userId || userDoc.id,
                                    timestamp: data.timestamp ?? null,
                                });
                            }
                        });
                    } catch {
                        // Skip users whose queries we can't read
                    }
                })
            );

            setQueryLogs(allLogs);
        } catch (e) {
            setError(e instanceof Error ? e : new Error('Failed to load analytics'));
        } finally {
            setIsLoading(false);
        }
    }, [firestore]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return { queryLogs, isLoading, error, refresh: fetchAll };
}

function AnalyticsDashboard() {
    const firestore = useFirestore();

    const documentsCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'documents') : null),
        [firestore]
    );

    const { queryLogs, isLoading: logsLoading, error: logsError, refresh } = useAggregatedQueries();
    const { data: documents, isLoading: docsLoading } = useCollection<DocumentData>(documentsCollection);

    const analytics = useMemo(() => {
        if (!queryLogs) return null;

        const totalQueries = queryLogs.length;
        const unansweredQueries = queryLogs.filter((q) => !q.answerFound && q.responseType === 'answer');
        const uniqueUsers = new Set(queryLogs.map((q) => q.userId)).size;
        const totalDocs = documents?.length || 0;

        // Timeline data (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const dailyCounts = new Map<string, number>();

        for (let i = 0; i < 30; i++) {
            const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
            const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyCounts.set(key, 0);
        }

        queryLogs.forEach((log) => {
            if (log.timestamp) {
                const date = log.timestamp.toDate();
                if (date >= thirtyDaysAgo) {
                    const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
                }
            }
        });

        const timelineData = Array.from(dailyCounts.entries()).map(([date, count]) => ({
            date,
            queries: count,
        }));

        // Knowledge gaps
        const gapMap = new Map<string, number>();
        unansweredQueries.forEach((q) => {
            const normalized = q.query.toLowerCase().trim();
            gapMap.set(normalized, (gapMap.get(normalized) || 0) + 1);
        });
        const knowledgeGaps = Array.from(gapMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([query, count]) => ({ query, count }));

        // Top cited documents
        const citationMap = new Map<string, number>();
        queryLogs.forEach((log) => {
            log.citations?.forEach((citation) => {
                citationMap.set(citation, (citationMap.get(citation) || 0) + 1);
            });
        });
        const topDocuments = Array.from(citationMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, citations]) => ({ name, citations }));

        // Recent queries (latest 20)
        const recentQueries = [...queryLogs]
            .filter((q) => q.timestamp)
            .sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0))
            .slice(0, 20);

        return {
            totalQueries,
            unansweredCount: unansweredQueries.length,
            uniqueUsers,
            totalDocs,
            timelineData,
            knowledgeGaps,
            topDocuments,
            recentQueries,
        };
    }, [queryLogs, documents]);

    if (logsError) {
        return (
            <div className="space-y-6">
                <h1 className="text-lg font-semibold md:text-2xl">Analytics</h1>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Analytics</AlertTitle>
                    <AlertDescription>{logsError.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (logsLoading || docsLoading || !analytics) {
        return <AnalyticsSkeleton />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Analytics</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Understand employee queries, knowledge gaps, and document usage.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                        <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalQueries}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unanswered</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{analytics.unansweredCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.totalQueries > 0
                                ? `${((analytics.unansweredCount / analytics.totalQueries) * 100).toFixed(1)}% of queries`
                                : 'No queries yet'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.uniqueUsers}</div>
                        <p className="text-xs text-muted-foreground">Unique users who queried</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalDocs}</div>
                        <p className="text-xs text-muted-foreground">In knowledge base</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-4 w-4" />
                            Query Timeline
                        </CardTitle>
                        <CardDescription>Queries per day (last 30 days)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={analytics.timelineData}>
                                <defs>
                                    <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="queries" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#queryGradient)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-4 w-4" />
                            Top Cited Documents
                        </CardTitle>
                        <CardDescription>Most referenced documents in answers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {analytics.topDocuments.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={analytics.topDocuments} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                                    <Bar dataKey="citations" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                                No citation data yet. Users need to ask questions first.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Knowledge Gaps */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Knowledge Gaps
                    </CardTitle>
                    <CardDescription>
                        Queries employees asked that couldn&apos;t be answered — these indicate missing documentation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {analytics.knowledgeGaps.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Unanswered Query</TableHead>
                                        <TableHead className="w-[100px] text-right">Frequency</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analytics.knowledgeGaps.map((gap, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{gap.query}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="secondary">{gap.count}x</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                            🎉 No knowledge gaps detected! All queries have been answered.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Queries */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Recent Queries</CardTitle>
                    <CardDescription>Latest 20 employee queries</CardDescription>
                </CardHeader>
                <CardContent>
                    {analytics.recentQueries.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Query</TableHead>
                                        <TableHead className="w-[100px]">Status</TableHead>
                                        <TableHead className="w-[140px]">Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analytics.recentQueries.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="max-w-[400px] truncate font-medium">
                                                {log.query}
                                            </TableCell>
                                            <TableCell>
                                                {log.answerFound ? (
                                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
                                                        Answered
                                                    </Badge>
                                                ) : log.responseType === 'clarification' ? (
                                                    <Badge variant="outline">Clarified</Badge>
                                                ) : (
                                                    <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20">
                                                        Unanswered
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {log.timestamp
                                                    ? log.timestamp.toDate().toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })
                                                    : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                            No queries recorded yet. Send some questions in the chatbot to see data here.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function AnalyticsPage() {
    const { isAdmin, isAdminLoading } = useAdmin();

    if (isAdminLoading) {
        return <AnalyticsSkeleton />;
    }

    if (!isAdmin) {
        return <AccessDenied />;
    }

    return <AnalyticsDashboard />;
}
