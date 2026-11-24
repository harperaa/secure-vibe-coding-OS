import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome to your dashboard</CardTitle>
          <CardDescription>
            This page is intentionally blank — build your app here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Want a working example? Install the sample dashboard (KPI cards,
          chart, and data table) with /add-module dashboard-sample.
        </CardContent>
      </Card>
    </div>
  )
}
