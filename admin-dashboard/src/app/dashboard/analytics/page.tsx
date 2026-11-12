'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { useEvents, useEventAnalytics } from '@/hooks/useEvents';
import { Users, TrendingUp, Vote, FileText, Loader2, BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: events } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const { data: analytics, isLoading } = useEventAnalytics(selectedEvent);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Engagement and attendance by event</p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label htmlFor="analytics-event-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Event
        </label>
        <p className="mb-3 text-sm text-gray-500">Choose an event to view attendance, engagement, and leaderboard.</p>
        <Select
          id="analytics-event-select"
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Choose an event…</option>
          {Array.isArray(events) && events.map((event: any) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>
      </section>

      {selectedEvent ? (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20 shadow-sm">
              <Loader2 className="animate-spin text-primary-500" size={32} aria-hidden />
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Attendance"
                  value={analytics.attendance_count}
                  icon={Users}
                  color="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <StatCard
                  title="Poll Participation"
                  value={analytics.poll_participation}
                  icon={Vote}
                  color="bg-green-50"
                  iconColor="text-green-600"
                />
                <StatCard
                  title="Materials"
                  value={analytics.materials?.total_materials ?? 0}
                  icon={FileText}
                  color="bg-purple-50"
                  iconColor="text-purple-600"
                />
                <StatCard
                  title="Avg Engagement"
                  value={`${analytics.average_engagement_score}%`}
                  icon={TrendingUp}
                  color="bg-orange-50"
                  iconColor="text-orange-600"
                />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Top Engaged Students</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Ranked by engagement score</p>
                </div>
                <div className="overflow-x-auto">
                  {analytics.top_students && analytics.top_students.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">#</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">User</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analytics.top_students.map((student: any, index: number) => (
                          <tr key={student.user_id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">
                              <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-900 font-mono text-sm">
                              {student.user_id.slice(0, 8)}…
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-semibold text-primary-600 tabular-nums">{student.score}</span>
                              <span className="text-sm text-gray-500 ml-1">pts</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>No engagement data yet</p>
                      <p className="text-sm mt-1">Activity will appear as students join and participate</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center px-8 py-14 text-center sm:py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <BarChart3 size={32} className="text-gray-400" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Choose an event</h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Select an event from the dropdown above to view attendance, engagement scores, and the top students leaderboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  iconColor,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className={iconColor} size={22} />
        </div>
      </div>
    </div>
  );
}
