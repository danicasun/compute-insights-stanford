"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Server,
  Activity,
  Users,
  TrendingUp,
  RefreshCw,
  Clock,
  Zap,
  Search,
  AlertTriangle,
  HelpCircle,
  Download,
  Share,
  BookmarkPlus,
  Filter,
  Bell,
  BookOpen,
} from "lucide-react"
import { OverviewTab } from "@/components/dashboard/overview-tab"
import { EnergyTab } from "@/components/dashboard/energy-tab"
import { QueueWalltimeTab } from "@/components/dashboard/queue-walltime-tab"
import { UsersAccountsTab } from "@/components/dashboard/users-accounts-tab"
import { TemporalTab } from "@/components/dashboard/temporal-tab"
import { DocumentationTab } from "@/components/dashboard/documentation-tab"
import { JobForecastTab } from "@/components/dashboard/job-forecast-tab"
import { useDashboardInsights } from "@/hooks/useDashboardInsights"
import { dashboardTabListClass, dashboardTabTriggerClass } from "@/lib/dashboard-ui"

export default function Dashboard() {
  const { data, loading, error, lastUpdated, refreshData } = useDashboardInsights()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAlerts, setShowAlerts] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const handleRefresh = async () => {
    await refreshData()
  }

  const alerts: Array<{ type: string; message: string; action: string; tab: string }> = []

  const tabDescriptions = {
    overview: "Dataset summary and headline energy, queue, and walltime metrics",
    energy: "Energy consumption breakdowns by job type and user",
    "queue-walltime": "Queue wait time and requested walltime distributions",
    "users-accounts": "User and account usage rankings with energy context",
    temporal: "Daily and hourly patterns in job volume and energy",
    "job-forecast": "Mock job forecast for energy and emissions predictions",
    documentation: "Data schema, missingness, and units reference",
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-primary/35 bg-background/95 backdrop-blur-sm">
          <div className="container mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg border border-primary/40 bg-muted/40">
                    <Server className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">Stanford Sherlock</h1>
                    <p className="text-sm text-muted-foreground font-medium">TabPFN Dashboard Insights</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search metrics, users, jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 border border-primary/35 bg-background"
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="border-primary/35 bg-transparent">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border border-primary/35">
                    <DropdownMenuItem className="gap-2">
                      <Download className="h-4 w-4" />
                      Export Data
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Share className="h-4 w-4" />
                      Share Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <BookmarkPlus className="h-4 w-4" />
                      Save View
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu open={showAlerts} onOpenChange={setShowAlerts}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-primary/35 relative bg-transparent"
                    >
                      <Bell className="h-4 w-4" />
                      {alerts.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full"></span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border border-primary/35 w-80">
                    {alerts.map((alert, index) => (
                      <div key={index} className="p-3 border-b last:border-b-0">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm">{alert.message}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 h-7 text-xs bg-transparent"
                              onClick={() => {
                                setActiveTab(alert.tab)
                                setShowAlerts(false)
                              }}
                            >
                              {alert.action}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="text-right hidden sm:block">
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                    <Clock className="h-4 w-4" />
                    <span>Last updated: {lastUpdated}</span>
                  </div>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="gap-2 px-6 py-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  <span className="font-semibold">Refresh</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-8 py-12">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Error loading data: {error}</span>
              </div>
            </div>
          )}
          
          {loading && !data ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium">Loading dashboard insights...</p>
                <p className="text-sm text-muted-foreground">Please wait while we fetch the latest dataset snapshot</p>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tabDescriptions[activeTab as keyof typeof tabDescriptions]}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <TabsList className={dashboardTabListClass}>
              <TabsTrigger value="overview" className={dashboardTabTriggerClass}>
                <Activity className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs font-medium lg:text-sm">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="energy" className={dashboardTabTriggerClass}>
                <Zap className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs font-medium lg:text-sm">Energy</span>
              </TabsTrigger>
              <TabsTrigger value="queue-walltime" className={dashboardTabTriggerClass}>
                <Clock className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs font-medium lg:text-sm">Queue & Walltime</span>
              </TabsTrigger>
              <TabsTrigger value="users-accounts" className={dashboardTabTriggerClass}>
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs font-medium lg:text-sm">Users & Accounts</span>
              </TabsTrigger>
              <TabsTrigger value="temporal" className={dashboardTabTriggerClass}>
                <TrendingUp className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs font-medium lg:text-sm">Temporal</span>
              </TabsTrigger>
              <TabsTrigger value="job-forecast" className={dashboardTabTriggerClass}>
                <Zap className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs font-medium lg:text-sm">Job Forecast</span>
              </TabsTrigger>
              <TabsTrigger value="documentation" className={dashboardTabTriggerClass}>
                <BookOpen className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs font-medium lg:text-sm">Data Quality</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab data={data!} />
            </TabsContent>

            <TabsContent value="energy">
              <EnergyTab data={data!} />
            </TabsContent>

            <TabsContent value="queue-walltime">
              <QueueWalltimeTab data={data!} />
            </TabsContent>

            <TabsContent value="users-accounts">
              <UsersAccountsTab data={data!} />
            </TabsContent>

            <TabsContent value="temporal">
              <TemporalTab data={data!} />
            </TabsContent>

            <TabsContent value="job-forecast">
              <JobForecastTab />
            </TabsContent>

            <TabsContent value="documentation">
              <DocumentationTab data={data!} />
            </TabsContent>
          </Tabs>
        )}
        </main>
      </div>
    </TooltipProvider>
  )
}
