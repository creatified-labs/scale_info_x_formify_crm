"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Trash2, Phone, Calendar, Clock, CheckCircle, Circle, PoundSterling, Edit, UserX, Users, Filter, X, RotateCcw, Calendar as CalendarIcon } from "lucide-react";
import { Call, CallStats } from "@/types/calls";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import * as callsRepo from "@/lib/repo/calls";
import { MigrationTool } from "./MigrationTool";
import { useCurrency } from "@/hooks/useCurrency";

type TimeRange = 'last7days' | 'last14days' | 'thisMonth' | 'last30days' | 'allTime';

const CallsManager = () => {
  const { symbol: currencySymbol } = useCurrency();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingCall, setIsAddingCall] = useState(false);
  const [editingCall, setEditingCall] = useState<Call | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('allTime');

  // Fetch calls using repository
  const fetchCalls = async () => {
    try {
      setLoading(true);
      const data = await callsRepo.listCalls();

      // Transform to Call interface
      const transformedCalls: Call[] = data.map((call: any) => ({
        id: call.id,
        clientName: call.client_name,
        email: call.client_email || undefined,
        phone: call.client_phone || undefined,
        callType: 'call' as const,
        date: call.start_utc.split('T')[0],
        time: new Date(call.start_utc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        duration: Math.round((new Date(call.end_utc).getTime() - new Date(call.start_utc).getTime()) / (1000 * 60)),
        notes: call.notes || undefined,
        status: call.status as Call['status'],
        isConverted: Number(call.conversion_amount) > 0,
        conversionAmount: Number(call.conversion_amount) > 0 ? Number(call.conversion_amount) : undefined,
        createdAt: new Date(call.created_at),
      }));

      setCalls(transformedCalls);
    } catch (error: any) {
      console.error('Error fetching calls:', error);
      toast.error(error.message || 'Failed to load calls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const addCall = async (callData: Omit<Call, 'id' | 'createdAt'>) => {
    await callsRepo.createCall({
      clientName: callData.clientName,
      clientEmail: callData.email,
      clientPhone: callData.phone,
      date: callData.date,
      time: callData.time,
      duration: callData.duration,
      status: callData.status,
      notes: callData.notes,
      conversionAmount: callData.isConverted ? (callData.conversionAmount || 0) : 0,
    });
    await fetchCalls();
    toast.success('Call added successfully');
  };

  const updateCall = async (call: Call) => {
    await callsRepo.updateCall({
      id: call.id,
      clientName: call.clientName,
      clientEmail: call.email,
      clientPhone: call.phone,
      date: call.date,
      time: call.time,
      duration: call.duration,
      status: call.status,
      conversionAmount: call.isConverted ? (call.conversionAmount || 0) : 0,
      notes: call.notes,
    });
    await fetchCalls();
    toast.success('Call updated successfully');
  };

  const deleteCall = async (callId: string) => {
    await callsRepo.deleteCall(callId);
    await fetchCalls();
    toast.success('Call deleted successfully');
  };
  const [formData, setFormData] = useState<{
    clientName: string;
    callType: "call" | "meeting" | "consultation";
    date: string;
    time: string;
    duration: number;
    notes: string;
    status: "scheduled" | "completed" | "cancelled" | "no-show" | "hasn't paid yet";
    isConverted: boolean;
    conversionAmount: string | number;
  }>({
    clientName: "",
    callType: "call" as "call" | "meeting" | "consultation",
    date: new Date().toISOString().split('T')[0],
    time: "09:00",
    duration: 30,
    notes: "",
    status: "scheduled" as "scheduled" | "completed" | "cancelled" | "no-show" | "hasn't paid yet",
    isConverted: false,
    conversionAmount: "",
  });

  // Filter calls based on time range
  const filteredCalls = useMemo(() => {
    if (timeRange === 'allTime') {
      return calls;
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timeRange) {
      case 'last7days':
        startDate = subDays(now, 7);
        break;
      case 'last14days':
        startDate = subDays(now, 14);
        break;
      case 'thisMonth':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last30days':
        startDate = subDays(now, 30);
        break;
      default:
        return calls;
    }

    return calls.filter(call => {
      const callDate = new Date(call.date);
      return callDate >= startDate && callDate <= endDate;
    });
  }, [calls, timeRange]);

  const callStats: CallStats = useMemo(() => {
    const statsData = filteredCalls;
    
    return {
      totalCalls: statsData.length,
      completedCalls: statsData.filter(call => call.status === 'completed').length,
      noShowCalls: statsData.filter(call => call.status === 'no-show').length,
      showRate: (() => {
        const actuallyHappened = statsData.filter(call => call.status === 'completed' || call.status === 'no-show').length;
        const showedUp = statsData.filter(call => call.status === 'completed').length;
        return actuallyHappened > 0 ? (showedUp / actuallyHappened) * 100 : 0;
      })(),
      conversions: statsData.filter(call => call.isConverted).length,
      conversionRate: (() => {
        const eligibleCalls = statsData.filter(call => call.status === 'completed' || call.status === "hasn't paid yet");
        return eligibleCalls.length > 0 
          ? (statsData.filter(call => call.isConverted && call.status === 'completed').length / eligibleCalls.length) * 100 
          : 0;
      })(),
      totalRevenue: statsData.filter(call => call.isConverted).reduce((sum, call) => sum + (call.conversionAmount || 0), 0),
    };
  }, [filteredCalls]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.date || isSubmitting) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingCall) {
        // Update existing call
        const updatedCall: Call = {
          ...editingCall,
          ...formData,
          conversionAmount: formData.conversionAmount ? Number(formData.conversionAmount) : 0,
        };

        console.log('Updating call:', updatedCall);
        await updateCall(updatedCall);
        setEditingCall(null);
      } else {
        // Add new call
        const newCallData = {
          clientName: formData.clientName,
          callType: formData.callType,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          notes: formData.notes,
          status: formData.status,
          isConverted: formData.isConverted,
          conversionAmount: formData.conversionAmount ? Number(formData.conversionAmount) : 0,
        };

        console.log('Adding new call:', newCallData);
        await addCall(newCallData);
      }
      
      // Reset form
      setFormData({
        clientName: "",
        callType: "call",
        date: new Date().toISOString().split('T')[0],
        time: "09:00",
        duration: 30,
        notes: "",
        status: "scheduled",
        isConverted: false,
        conversionAmount: "",
      });
      
      setIsAddingCall(false);
      console.log('Form reset and closed');
    } catch (error) {
      console.error('Error with call:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCall = (call: Call) => {
    setEditingCall(call);
    setFormData({
      clientName: call.clientName,
      callType: call.callType,
      date: call.date,
      time: call.time,
      duration: call.duration,
      notes: call.notes || "",
      status: call.status,
      isConverted: call.isConverted || false,
      conversionAmount: call.conversionAmount || "",
    });
    setIsAddingCall(true);
  };

  const handleToggleConversion = (call: Call) => {
    const updatedCall = { ...call, isConverted: !call.isConverted };
    
    if (!call.isConverted && !call.conversionAmount) {
      // Prompt for conversion amount if converting
      const amount = prompt(`Enter conversion amount (${currencySymbol}):`)
      if (amount && !isNaN(Number(amount))) {
        updatedCall.conversionAmount = Number(amount);
      } else {
        return;
      }
    }
    
    updateCall(updatedCall);
    toast.success(updatedCall.isConverted ? "Call marked as converted!" : "Conversion removed");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'cancelled': return <Circle className="w-4 h-4 text-red-600" />;
      case 'no-show': return <Circle className="w-4 h-4 text-orange-600" />;
      case "hasn't paid yet": return <Circle className="w-4 h-4 text-yellow-600" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getCallTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="w-4 h-4" />;
      case 'meeting': return <Calendar className="w-4 h-4" />;
      case 'consultation': return <Calendar className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Loading calls...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Time Range Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Time Range:</Label>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Last 7 days</SelectItem>
              <SelectItem value="last14days">Last 14 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="last30days">Last 30 days</SelectItem>
              <SelectItem value="allTime">All time</SelectItem>
            </SelectContent>
          </Select>
          {timeRange !== 'allTime' && (
            <Badge variant="secondary" className="ml-2">
              {filteredCalls.length} of {calls.length} calls
            </Badge>
          )}
        </div>
      </div>

      {/* Migration Tool */}
      <MigrationTool />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.totalCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Shows</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{callStats.noShowCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Show Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{callStats.showRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed vs No-shows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.completedCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.conversions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{callStats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Call Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {editingCall ? "Edit Call" : "Add New Call"}
            <Button 
              onClick={() => {
                setIsAddingCall(!isAddingCall);
                if (isAddingCall) {
                  setEditingCall(null);
                  setFormData({
                    clientName: "",
                    callType: "call",
                    date: new Date().toISOString().split('T')[0],
                    time: "09:00",
                    duration: 30,
                    notes: "",
                    status: "scheduled",
                    isConverted: false,
                    conversionAmount: "",
                  });
                }
              }}
              variant="outline"
            >
              {isAddingCall ? "Cancel" : "Add Call"}
            </Button>
          </CardTitle>
        </CardHeader>
        {isAddingCall && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => {
                      e.preventDefault();
                      setFormData({ ...formData, clientName: e.target.value });
                    }}
                    required
                    autoComplete="off"
                  />
                </div>

                <div>
                  <Label htmlFor="callType">Call Type</Label>
                  <Select 
                    value={formData.callType} 
                    onValueChange={(value: any) => setFormData({ ...formData, callType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    min="1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no-show">No Show</SelectItem>
                      <SelectItem value="hasn't paid yet">Hasn't Paid Yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.status === 'completed' || formData.status === "hasn't paid yet") && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isConverted"
                        checked={formData.isConverted}
                        onCheckedChange={(checked) => setFormData({ ...formData, isConverted: checked })}
                      />
                      <Label htmlFor="isConverted">Converted to Sale</Label>
                    </div>
                    {formData.isConverted && (
                      <>
                        <div>
                          <Label htmlFor="conversionAmount">Conversion Amount ({currencySymbol})</Label>
                           <Input
                            id="conversionAmount"
                            type="number"
                            value={formData.conversionAmount}
                            onChange={(e) => setFormData({ ...formData, conversionAmount: e.target.value })}
                            min="0"
                            step="0.01"
                            placeholder="Enter amount"
                          />
                         </div>
                       </>
                     )}
                   </div>
                 )}
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (editingCall ? "Updating..." : "Adding...") : (editingCall ? "Update Call" : "Add Call")}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Calls List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {timeRange !== 'allTime' ? 'Filtered Calls' : 'Recent Calls'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCalls.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {calls.length === 0 ? 'No calls recorded yet. Add your first call above!' : 'No calls found for the selected time range.'}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getCallTypeIcon(call.callType)}
                    <div>
                      <h3 className="font-medium">{call.clientName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {call.callType} • {call.date} {call.time} • {call.duration}min
                      </p>
                      {call.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{call.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(call.status)}
                        <span className="capitalize">{call.status}</span>
                      </div>
                    </Badge>
                    
                    {call.isConverted && (
                      <Badge variant="default" className="bg-green-600">
                        {currencySymbol}{call.conversionAmount?.toLocaleString()}
                      </Badge>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditCall(call)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    {call.status === 'completed' && (
                      <Button
                        size="sm"
                        variant={call.isConverted ? "secondary" : "default"}
                        onClick={() => handleToggleConversion(call)}
                      >
                        {call.isConverted ? "Remove Conversion" : "Mark Converted"}
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteCall(call.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CallsManager;