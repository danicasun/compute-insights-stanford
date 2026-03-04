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
  Cpu,
  Users,
  TrendingUp,
  RefreshCw,
  Clock,
  Zap,
  Target,
  Brain,
  Leaf,
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
import { PerformanceTab } from "@/components/dashboard/performance-tab"
import { ResourcesTab } from "@/components/dashboard/resources-tab"
import { UsersTab } from "@/components/dashboard/users-tab"
import { TrendsTab } from "@/components/dashboard/trends-tab"
import { EfficiencyTab } from "@/components/dashboard/efficiency-tab"
import { PredictiveTab } from "@/components/dashboard/predictive-tab"
import { SustainabilityTab } from "@/components/dashboard/sustainability-tab"
import { DocumentationTab } from "@/components/dashboard/documentation-tab"
import { useSlurmData } from "@/hooks/useSlurmData"

export default function Dashboard() {
  const { data, loading, error, lastUpdated, refreshData } = useSlurmData()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAlerts, setShowAlerts] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const handleRefresh = async () => {
    await refreshData()
  }

  const alerts = [
    {
      type: "warning",
      message: "High failure rate detected: 19.33% of jobs failed",
      action: "View Performance",
      tab: "performance",
    },
    {
      type: "info",
      message: "Resource efficiency could be improved by 23.4%",
      action: "View Efficiency",
      tab: "efficiency",
    },
  ]

  const tabDescriptions = {
    overview: "High-level cluster health and job statistics from real SLURM data",
    performance: "Job execution metrics and system performance analysis",
    resources: "CPU, memory, and GPU utilization analysis from cluster data",
    users: "User activity patterns and top contributors from SLURM records",
    trends: "Historical patterns and usage trends over time from real data",
    efficiency: "Resource optimization and waste analysis based on actual usage",
    predictive: "AI-powered forecasting and predictions from historical data",
    sustainability: "Resource efficiency and sustainability metrics from cluster performance",
    documentation: "Comprehensive documentation of data sources, calculations, and assumptions",
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <header className="glass-card border-b-0 sticky top-0 z-50 shadow-lg">
          <div className="container mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
                    <Server className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      Stanford Sherlock
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">SLURM Cluster Analytics</p>
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
                    className="pl-10 w-64 glass-card border-0 shadow-md"
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="glass-card border-0 shadow-md bg-transparent">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card border-0 shadow-lg">
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
                      className="glass-card border-0 shadow-md relative bg-transparent"
                    >
                      <Bell className="h-4 w-4" />
                      {alerts.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full"></span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card border-0 shadow-lg w-80">
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
                  className="gap-2 px-6 py-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
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
                <p className="text-lg font-medium">Loading SLURM data...</p>
                <p className="text-sm text-muted-foreground">Please wait while we fetch the latest cluster information</p>
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

            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 lg:w-fit glass-card border-0 shadow-lg p-2 h-auto gap-1">
              <TabsTrigger
                value="overview"
                className="gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline font-medium text-xs lg:text-sm">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className="gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline font-medium text-xs lg:text-sm">Performance</span>
              </TabsTrigger>
              <TabsTrigger
                value="resources"
                className="gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Cpu className="h-4 w-4" />
                <span className="hidden sm:inline font-medium text-xs lg:text-sm">Resources</span>
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline font-medium text-xs lg:text-sm">Users</span>
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className="gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline font-medium text-xs lg:text-sm">Trends</span>
              </TabsTrigger>
              <TabsTrigger
                value="efficiency"
                className="gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline font-medium text-xs lg:text-sm">Efficiency</span>
              </TabsTrigger>
              <TabsTrigger
                value="predictive"
                className="gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline font-medium text-xs lg:text-sm">Predictive</span>
              </TabsTrigger>
              <TabsTrigger
                value="sustainability"
                className="gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Leaf className="h-4 w-4" />
                <span className="hidden sm:inline font-medium text-xs lg:text-sm">Green</span>
              </TabsTrigger>
              <TabsTrigger
                value="documentation"
                className="gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline font-medium text-xs lg:text-sm">Docs</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab data={data!} />
            </TabsContent>

            <TabsContent value="performance">
              <PerformanceTab data={data!} />
            </TabsContent>

            <TabsContent value="resources">
              <ResourcesTab data={data!} />
            </TabsContent>

            <TabsContent value="users">
              <UsersTab data={data!} />
            </TabsContent>

            <TabsContent value="trends">
              <TrendsTab data={data!} />
            </TabsContent>

            <TabsContent value="efficiency">
              <EfficiencyTab data={data!} />
            </TabsContent>

            <TabsContent value="predictive">
              <PredictiveTab data={data!} />
            </TabsContent>

            <TabsContent value="sustainability">
              <SustainabilityTab data={data!} />
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
