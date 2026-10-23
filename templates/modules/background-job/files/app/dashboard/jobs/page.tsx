"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT = {
  queued: "secondary",
  running: "default",
  done: "outline",
  failed: "destructive",
} as const;

/**
 * Background job example. Submits work with api.jobs.startJob and watches it
 * through api.jobs.listJobs. useQuery is a live subscription: every status
 * change the Convex action writes (queued -> running -> queued (retry) ->
 * done/failed) re-renders this table with no polling and no refresh.
 */
export default function JobsPage() {
  const jobs = useQuery(api.jobs.listJobs);
  const startJob = useMutation(api.jobs.startJob);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(value: string) {
    setError(null);
    setSubmitting(true);
    try {
      await startJob({ input: value });
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Background jobs</CardTitle>
            <CardDescription>
              Work that is too slow for a request runs in a Convex action and reports
              back here as it goes. Add <code>!flaky</code> to the end of the input to
              watch two simulated failures and the retries that recover from them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) void submit(input.trim());
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Something to process"
                maxLength={2000}
                aria-label="Job input"
              />
              <Button type="submit" disabled={submitting || !input.trim()}>
                Start job
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => void submit("demo !flaky")}
              >
                Start flaky demo
              </Button>
            </form>
            {error && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent jobs</CardTitle>
            <CardDescription>Newest activity first, updates live.</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs === undefined ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Input</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job._id}>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-xs">
                        {job.input}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{job.attempts}</TableCell>
                      <TableCell className="text-sm">
                        {job.status === "done"
                          ? job.result
                          : job.error
                            ? <span className="text-muted-foreground">{job.error}</span>
                            : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
