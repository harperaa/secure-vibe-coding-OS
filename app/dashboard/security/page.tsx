"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconShieldCheck, IconAlertTriangle, IconActivity, IconAlertCircle, IconInfoCircle, IconCalendar, IconX, IconLock } from "@tabler/icons-react";
import { SecurityEventsFeed } from "./security-events-feed";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

type DateRangePreset = "24h" | "7d" | "30d" | "custom";

export default function SecurityDashboard() {
  const router = useRouter();

  // All hooks must be called before any conditional returns
  const isAdmin = useQuery(api.users.checkIsAdmin);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("7d");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | undefined>("open");
  const [severityFilter, setSeverityFilter] = useState<"critical" | "high" | "medium" | "low" | undefined>(undefined);

  // Calculate time range based on preset or custom dates
  const { startTime, endTime } = useMemo(() => {
    const now = Date.now();

    if (dateRangePreset === "custom") {
      return {
        startTime: customStartDate ? customStartDate.getTime() : undefined,
        endTime: customEndDate ? customEndDate.getTime() + 86400000 - 1 : undefined, // End of day
      };
    }

    switch (dateRangePreset) {
      case "24h":
        return { startTime: now - 24 * 60 * 60 * 1000, endTime: undefined };
      case "7d":
        return { startTime: now - 7 * 24 * 60 * 60 * 1000, endTime: undefined };
      case "30d":
        return { startTime: now - 30 * 24 * 60 * 60 * 1000, endTime: undefined };
      default:
        return { startTime: undefined, endTime: undefined };
    }
  }, [dateRangePreset, customStartDate, customEndDate]);

  // Get filtered summary (counts update based on event type filter)
  // Skip query if not admin (will throw on backend anyway)
  const securitySummary = useQuery(
    api.security.getSecuritySummary,
    isAdmin ? { startTime, endTime, eventType: eventTypeFilter } : "skip"
  );

  // Get unfiltered summary for event type breakdown (so filter badges always show all types)
  const unfilteredSummary = useQuery(
    api.security.getSecuritySummary,
    isAdmin ? { startTime, endTime } : "skip"
  );

  // Show loading state while checking admin status
  if (isAdmin === undefined) {
    return (
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Checking access...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-6">
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 py-8">
                <IconLock className="h-12 w-12 text-red-500" />
                <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">Access Denied</h2>
                <p className="text-center text-muted-foreground max-w-md">
                  The Security Dashboard is only accessible to administrators.
                  Please contact your system administrator if you believe you should have access.
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  className="mt-2"
                >
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Helper to get readable event type labels
  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      origin_mismatch: "Origin Mismatch",
      rate_limit_exceeded: "Rate Limit Exceeded",
      invalid_api_key: "Invalid API Key",
      fingerprint_change: "Fingerprint Change",
      suspicious_activity: "Suspicious Activity",
      jwt_validation_failed: "JWT Validation Failed",
      unauthorized_access: "Unauthorized Access",
      input_validation_failed: "Input Validation Failed",
      replay_detected: "Replay Attack",
      not_found_enumeration: "Enumeration Attempt",
      http_origin_blocked: "Origin Blocked",
      xss_attempt: "XSS Attempt",
      fingerprint_manipulation: "Fingerprint Manipulation",
    };
    return labels[eventType] || eventType.replace(/_/g, " ");
  };

  // Use unfiltered summary for determining if there are events and for event type badges
  const hasEvents = unfilteredSummary && unfilteredSummary.totalEvents > 0;
  const eventTypeBreakdown = unfilteredSummary?.eventTypeBreakdown || {};

  if (securitySummary === undefined || unfilteredSummary === undefined) {
    return (
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading Security Dashboard...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Security Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Monitor security events and potential threats in your application
            </p>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border bg-muted/50 p-1">
              <Button
                variant={dateRangePreset === "24h" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDateRangePreset("24h")}
                className="text-xs"
              >
                24h
              </Button>
              <Button
                variant={dateRangePreset === "7d" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDateRangePreset("7d")}
                className="text-xs"
              >
                7 days
              </Button>
              <Button
                variant={dateRangePreset === "30d" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDateRangePreset("30d")}
                className="text-xs"
              >
                30 days
              </Button>
              <Button
                variant={dateRangePreset === "custom" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDateRangePreset("custom")}
                className="text-xs"
              >
                Custom
              </Button>
            </div>

            {/* Custom Date Range Picker */}
            {dateRangePreset === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      <IconCalendar className="h-3.5 w-3.5 mr-1.5" />
                      {customStartDate ? format(customStartDate, "MMM d, yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-sm">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      <IconCalendar className="h-3.5 w-3.5 mr-1.5" />
                      {customEndDate ? format(customEndDate, "MMM d, yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        {/* Filters - Only show if there are events */}
        {hasEvents && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Status Filter (Open/Closed) */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <div className="flex rounded-lg border bg-muted/50 p-1">
                <Button
                  variant={statusFilter === "open" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("open")}
                  className="text-xs h-7"
                >
                  Open ({securitySummary.unreadCount})
                </Button>
                <Button
                  variant={statusFilter === "closed" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("closed")}
                  className="text-xs h-7"
                >
                  Closed ({securitySummary.totalEvents - securitySummary.unreadCount})
                </Button>
                <Button
                  variant={statusFilter === undefined ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter(undefined)}
                  className="text-xs h-7"
                >
                  All ({securitySummary.totalEvents})
                </Button>
              </div>
            </div>

            {/* Event Type Filters */}
            {Object.keys(eventTypeBreakdown).length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {eventTypeFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEventTypeFilter(undefined)}
                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <IconX className="h-3 w-3 mr-1" />
                    Clear type
                  </Button>
                )}
                {Object.entries(eventTypeBreakdown).map(([type, count]) => (
                  <Badge
                    key={type}
                    variant={eventTypeFilter === type ? "default" : "outline"}
                    className={`cursor-pointer capitalize transition-colors ${
                      eventTypeFilter === type
                        ? ""
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                    onClick={() => setEventTypeFilter(eventTypeFilter === type ? undefined : type)}
                  >
                    {getEventTypeLabel(type)}
                    <span className="ml-1.5 text-xs opacity-70">({count as number})</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${severityFilter === undefined ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSeverityFilter(undefined)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <IconActivity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securitySummary.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                {securitySummary.unreadCount} unread
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              securitySummary.criticalCount > 0 ? "border-red-500/50 bg-red-500/5" : ""
            } ${severityFilter === "critical" ? "ring-2 ring-red-500" : ""}`}
            onClick={() => setSeverityFilter(severityFilter === "critical" ? undefined : "critical")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <IconAlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{securitySummary.criticalCount}</div>
              <p className="text-xs text-muted-foreground">
                Immediate action
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              securitySummary.highCount > 0 ? "border-orange-500/50 bg-orange-500/5" : ""
            } ${severityFilter === "high" ? "ring-2 ring-orange-500" : ""}`}
            onClick={() => setSeverityFilter(severityFilter === "high" ? undefined : "high")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High</CardTitle>
              <IconAlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{securitySummary.highCount}</div>
              <p className="text-xs text-muted-foreground">
                Auth failures
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              securitySummary.mediumCount > 0 ? "border-yellow-500/50 bg-yellow-500/5" : ""
            } ${severityFilter === "medium" ? "ring-2 ring-yellow-500" : ""}`}
            onClick={() => setSeverityFilter(severityFilter === "medium" ? undefined : "medium")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium</CardTitle>
              <IconAlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{securitySummary.mediumCount}</div>
              <p className="text-xs text-muted-foreground">
                Rate limits
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${severityFilter === "low" ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setSeverityFilter(severityFilter === "low" ? undefined : "low")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low</CardTitle>
              <IconInfoCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{securitySummary.lowCount}</div>
              <p className="text-xs text-muted-foreground">
                Informational
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <IconShieldCheck className={`h-4 w-4 ${
                securitySummary.criticalCount > 0 ? "text-red-500" :
                securitySummary.highCount > 0 ? "text-orange-500" :
                "text-green-500"
              }`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                securitySummary.criticalCount > 0 ? "text-red-600" :
                securitySummary.highCount > 0 ? "text-orange-600" :
                "text-green-600"
              }`}>
                {securitySummary.criticalCount > 0 ? "Critical" :
                 securitySummary.highCount > 0 ? "Alert" : "Secure"}
              </div>
              <p className="text-xs text-muted-foreground">
                Security monitoring active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Security Events Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Security Events</CardTitle>
            <CardDescription>
              Security alerts and suspicious activity across all your projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SecurityEventsFeed startTime={startTime} endTime={endTime} eventTypeFilter={eventTypeFilter} statusFilter={statusFilter} severityFilter={severityFilter} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
