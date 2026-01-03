"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconAlertTriangle, IconInfoCircle, IconShieldX, IconChevronDown, IconChevronUp, IconUser } from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";

interface SecurityEventsFeedProps {
  startTime?: number;
  endTime?: number;
  eventTypeFilter?: string;
  statusFilter?: "open" | "closed";
  severityFilter?: "critical" | "high" | "medium" | "low";
}

export function SecurityEventsFeed({ startTime, endTime, eventTypeFilter, statusFilter, severityFilter }: SecurityEventsFeedProps) {
  const events = useQuery(api.security.listSecurityEvents, {
    limit: 50,
    startTime,
    endTime,
    eventType: eventTypeFilter,
    status: statusFilter,
    severity: severityFilter,
  });
  const markAsRead = useMutation(api.security.markEventAsRead);
  const markAsUnread = useMutation(api.security.markEventAsUnread);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  if (events === undefined) {
    return <p className="text-sm text-muted-foreground">Loading events...</p>;
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No security events to display
      </p>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <IconShieldX className="h-5 w-5 text-red-500" />;
      case "high":
        return <IconAlertTriangle className="h-5 w-5 text-orange-500" />;
      case "medium":
        return <IconAlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <IconInfoCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 text-red-700 border-red-200";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getEventTitle = (eventType: string) => {
    const titles: Record<string, string> = {
      origin_mismatch: "Origin Mismatch",
      rate_limit_exceeded: "Rate Limit Exceeded",
      invalid_api_key: "Invalid API Key",
      fingerprint_change: "Fingerprint Change Detected",
      suspicious_activity: "Suspicious Activity",
      jwt_validation_failed: "JWT Validation Failed",
      // New event types
      unauthorized_access: "Unauthorized Access",
      input_validation_failed: "Input Validation Failed",
      replay_detected: "Replay Attack Detected",
      not_found_enumeration: "Potential Enumeration Attempt",
    };
    return titles[eventType] || eventType;
  };

  const getActionTypeLabel = (actionType: string | undefined) => {
    if (!actionType) return null;
    const labels: Record<string, string> = {
      submit: "Feature Submission",
      vote: "Vote",
      unvote: "Unvote",
      comment: "Comment",
      "delete-comment": "Delete Comment",
    };
    return labels[actionType] || actionType;
  };

  const formatRequestPayload = (payload: string | undefined) => {
    if (!payload) return null;
    try {
      const parsed = JSON.parse(payload);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return payload;
    }
  };

  const handleMarkAsRead = async (eventId: Id<"securityEvents">) => {
    try {
      await markAsRead({ eventId });
    } catch (error) {
      console.error("Failed to mark event as read:", error);
    }
  };

  const handleMarkAsUnread = async (eventId: Id<"securityEvents">) => {
    try {
      await markAsUnread({ eventId });
    } catch (error) {
      console.error("Failed to mark event as unread:", error);
    }
  };

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event._id}
          className={`rounded-lg border p-4 transition-opacity ${event.isRead ? "opacity-50 bg-muted/20" : "bg-muted/50"}`}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              checked={event.isRead}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleMarkAsRead(event._id);
                } else {
                  handleMarkAsUnread(event._id);
                }
              }}
              className="mt-1"
            />
            {getSeverityIcon(event.severity)}
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{getEventTitle(event.eventType)}</p>
                    {!event.isRead && (
                      <Badge variant="secondary" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTimestamp(event.timestamp)} • {event.userName} ({event.userEmail})
                  </p>
                </div>
                <Badge variant="outline" className={`text-xs ${getSeverityColor(event.severity)}`}>
                  {event.severity}
                </Badge>
              </div>

              {/* End User Info (from JWT) */}
              {(event.metadata.endUserEmail || event.metadata.endUserName || event.metadata.endUserId) && (
                <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded px-2 py-1.5 mt-2">
                  <IconUser className="h-3.5 w-3.5" />
                  <span className="font-medium">End User:</span>
                  {event.metadata.endUserName && <span>{event.metadata.endUserName}</span>}
                  {event.metadata.endUserEmail && <span className="text-blue-600 dark:text-blue-400">({event.metadata.endUserEmail})</span>}
                  {event.metadata.endUserId && !event.metadata.endUserEmail && <span className="opacity-70">ID: {event.metadata.endUserId}</span>}
                </div>
              )}

              {/* Action Type Badge */}
              {event.metadata.actionType && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200">
                    {getActionTypeLabel(event.metadata.actionType)}
                  </Badge>
                </div>
              )}

              {/* Event Metadata */}
              <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5 mt-2 font-mono">
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {event.metadata.endpoint && <span><b>Endpoint:</b> {event.metadata.endpoint}</span>}
                  {event.metadata.ipAddress && <span><b>IP:</b> {event.metadata.ipAddress}</span>}
                  {event.metadata.fingerprint && <span><b>FP:</b> {event.metadata.fingerprint.substring(0, 16)}...</span>}
                  {event.metadata.origin && <span><b>Origin:</b> {event.metadata.origin}</span>}
                </div>
                {event.metadata.errorMessage && (
                  <div className="mt-1"><b>Error:</b> {event.metadata.errorMessage}</div>
                )}
              </div>

              {/* Collapsible Request Payload */}
              {event.metadata.requestPayload && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(event._id)}
                    className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
                  >
                    {expandedEvents.has(event._id) ? (
                      <><IconChevronUp className="h-3 w-3 mr-1" /> Hide Request Payload</>
                    ) : (
                      <><IconChevronDown className="h-3 w-3 mr-1" /> Show Request Payload</>
                    )}
                  </Button>
                  {expandedEvents.has(event._id) && (
                    <pre className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded p-2 mt-1 overflow-x-auto max-h-48 overflow-y-auto">
                      {formatRequestPayload(event.metadata.requestPayload)}
                    </pre>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
