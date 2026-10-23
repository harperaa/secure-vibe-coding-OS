"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
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

const PAGE_SIZE = 10;

/**
 * Background job example. Submits work with api.jobs.startJob and watches it
 * through api.jobs.listJobs. usePaginatedQuery is a live subscription over
 * pages: every status change the Convex action writes (queued -> running ->
 * queued (retry) -> done/failed) re-renders this table with no polling and no
 * refresh, and "Load more" fetches the next page instead of the whole list.
 */
export default function JobsPage() {
  const { results: jobs, status, loadMore } = usePaginatedQuery(
    api.jobs.listJobs,
    {},
    { initialNumItems: PAGE_SIZE }
  );
  const startJob = useMutation(api.jobs.startJob);
  const clearFinished = useMutation(api.jobs.clearFinishedJobs);
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
            <CardDescription>
              Newest activity first, updates live, {PAGE_SIZE} at a time. Clearing deletes
              finished jobs in batches on the server, however many there are.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "LoadingFirstPage" ? (
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
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={status !== "CanLoadMore"}
                onClick={() => loadMore(PAGE_SIZE)}
              >
                {status === "LoadingMore" ? "Loading…" : status === "Exhausted" ? "No more jobs" : "Load more"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={jobs.length === 0}
                onClick={() => {
                  setError(null);
                  clearFinished({}).catch((err) =>
                    setError(err instanceof Error ? err.message : String(err))
                  );
                }}
              >
                Clear finished
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
