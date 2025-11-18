'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  title: string
  date: string
  status: string
  priority: string
  urgency: string
  severity: string
  daysRemaining: number
  equipment: { name: string; type: string; location?: string }
  assignee?: { name: string }
  color: string
  type: string
}

export default function MaintenanceCalendarPage() {
  const [view, setView] = useState<'month' | 'week' | 'list'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<{ [key: string]: CalendarEvent[] }>({})
  const [summary, setSummary] = useState({ total: 0, overdue: 0, dueSoon: 0, upcoming: 0 })

  useEffect(() => {
    fetchCalendarData()
  }, [currentDate, view])

  const fetchCalendarData = async () => {
    const start = getStartDate()
    const end = getEndDate()

    const res = await fetch(
      `/api/maintenance/calendar?view=${view}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`
    )
    const data = await res.json()

    if (view === 'list') {
      // For list view, convert array to object with single key
      setEvents({ all: data.events || [] })
    } else {
      setEvents(data.events || {})
    }
    setSummary(data.summary || { total: 0, overdue: 0, dueSoon: 0, upcoming: 0 })
  }

  const getStartDate = () => {
    if (view === 'month') {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    } else if (view === 'week') {
      const date = new Date(currentDate)
      const day = date.getDay()
      date.setDate(date.getDate() - day)
      return date
    }
    return currentDate
  }

  const getEndDate = () => {
    if (view === 'month') {
      return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    } else if (view === 'week') {
      const date = getStartDate()
      date.setDate(date.getDate() + 6)
      return date
    }
    const date = new Date(currentDate)
    date.setDate(date.getDate() + 30)
    return date
  }

  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentDate(newDate)
  }

  const getEventColor = (event: CalendarEvent) => {
    switch (event.color) {
      case 'red':
        return 'bg-red-100 border-l-4 border-red-500 text-red-900'
      case 'yellow':
        return 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900'
      case 'blue':
        return 'bg-blue-100 border-l-4 border-blue-500 text-blue-900'
      case 'green':
        return 'bg-green-100 border-l-4 border-green-500 text-green-900'
      default:
        return 'bg-gray-100 border-l-4 border-gray-500 text-gray-900'
    }
  }

  const renderMonthView = () => {
    const start = getStartDate()
    const end = getEndDate()
    const daysInMonth = end.getDate()
    const firstDayOfWeek = start.getDay()
    const weeks = []
    let days = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="border p-2 bg-gray-50 min-h-[100px]" />)
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        .toISOString()
        .split('T')[0]
      const dayEvents = events[dateKey] || []

      days.push(
        <div key={day} className="border p-2 min-h-[100px] hover:bg-gray-50">
          <div className="font-semibold text-sm mb-1">{day}</div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event) => (
              <Link
                key={event.id}
                href={`/maintenance/tasks/${event.id.replace('schedule-', '')}`}
                className={`text-xs p-1 rounded block truncate ${getEventColor(event)}`}
              >
                {event.title}
              </Link>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
            )}
          </div>
        </div>
      )

      if (days.length === 7) {
        weeks.push(
          <div key={`week-${weeks.length}`} className="grid grid-cols-7">
            {days}
          </div>
        )
        days = []
      }
    }

    // Add any remaining days
    if (days.length > 0) {
      while (days.length < 7) {
        days.push(<div key={`empty-end-${days.length}`} className="border p-2 bg-gray-50 min-h-[100px]" />)
      }
      weeks.push(
        <div key={`week-${weeks.length}`} className="grid grid-cols-7">
          {days}
        </div>
      )
    }

    return (
      <div>
        <div className="grid grid-cols-7 bg-gray-100 font-semibold text-sm">
          <div className="border p-2 text-center">Sun</div>
          <div className="border p-2 text-center">Mon</div>
          <div className="border p-2 text-center">Tue</div>
          <div className="border p-2 text-center">Wed</div>
          <div className="border p-2 text-center">Thu</div>
          <div className="border p-2 text-center">Fri</div>
          <div className="border p-2 text-center">Sat</div>
        </div>
        {weeks}
      </div>
    )
  }

  const renderListView = () => {
    const allEvents = events.all || []

    return (
      <div className="space-y-2">
        {allEvents.map((event) => (
          <Link
            key={event.id}
            href={`/maintenance/tasks/${event.id.replace('schedule-', '')}`}
            className={`p-4 rounded block ${getEventColor(event)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-semibold">{event.title}</div>
                <div className="text-sm mt-1">
                  {event.equipment.name} ({event.equipment.type})
                  {event.equipment.location && ` - ${event.equipment.location}`}
                </div>
                <div className="text-sm mt-1">
                  Due: {new Date(event.date).toLocaleDateString()} (
                  {event.daysRemaining >= 0
                    ? `${event.daysRemaining} days remaining`
                    : `${Math.abs(event.daysRemaining)} days overdue`}
                  )
                </div>
                {event.assignee && (
                  <div className="text-sm mt-1">Assigned to: {event.assignee.name}</div>
                )}
              </div>
              <div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    event.status === 'COMPLETED'
                      ? 'bg-green-600 text-white'
                      : event.status === 'IN_PROGRESS'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}
                >
                  {event.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Calendar</h1>

          <div className="flex items-center gap-4">
            {/* View Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-2 rounded ${
                  view === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border'
                }`}
              >
                <Calendar className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 rounded ${
                  view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation */}
            {view !== 'list' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={navigatePrevious}
                  className="p-2 border rounded hover:bg-gray-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="font-semibold px-4">
                  {view === 'month' &&
                    currentDate.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  {view === 'week' &&
                    `${getStartDate().toLocaleDateString()} - ${getEndDate().toLocaleDateString()}`}
                </div>
                <button onClick={navigateNext} className="p-2 border rounded hover:bg-gray-100">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Tasks</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Overdue</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{summary.overdue}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Due Soon</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">{summary.dueSoon}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Upcoming</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{summary.upcoming}</div>
          </div>
        </div>

        {/* Calendar/List View */}
        <div className="bg-white rounded-lg shadow p-4">
          {view === 'month' && renderMonthView()}
          {view === 'list' && renderListView()}
        </div>
      </div>
    </div>
  )
}
