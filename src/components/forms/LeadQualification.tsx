"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FormSubmission } from "@/types/forms";
import { TrendingUp, Users, Target, Calendar } from "lucide-react";

interface LeadQualificationProps {
  submissions: FormSubmission[];
}

export const LeadQualification = ({ submissions }: LeadQualificationProps) => {
  const qualified = submissions.filter(s => s.qualification_status === 'qualified').length;
  const hot = submissions.filter(s => s.qualification_status === 'hot').length;
  const cold = submissions.filter(s => s.qualification_status === 'cold').length;
  const scheduled = submissions.filter(s => s.scheduled_call_date).length;
  
  const avgLeadScore = submissions.length > 0
    ? (submissions.reduce((sum, s) => sum + s.lead_score, 0) / submissions.length).toFixed(1)
    : "0";

  const qualificationRate = submissions.length > 0
    ? ((qualified / submissions.length) * 100).toFixed(1)
    : "0";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Target className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500">{qualificationRate}%</div>
            <div className="text-xs text-muted-foreground">Qualification Rate</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{avgLeadScore}</div>
            <div className="text-xs text-muted-foreground">Avg Lead Score</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{hot}</div>
            <div className="text-xs text-muted-foreground">Hot Leads</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Calendar className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{scheduled}</div>
            <div className="text-xs text-muted-foreground">Scheduled Calls</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const getQualificationBadge = (status: string) => {
  const variants: Record<string, { color: string; label: string }> = {
    hot: { color: "bg-red-500", label: "Hot Lead" },
    qualified: { color: "bg-green-500", label: "Qualified" },
    cold: { color: "bg-blue-500", label: "Cold" },
    unqualified: { color: "bg-gray-500", label: "Unqualified" }
  };

  const config = variants[status] || variants.unqualified;
  
  return (
    <Badge className={`${config.color} text-white`}>
      {config.label}
    </Badge>
  );
};
