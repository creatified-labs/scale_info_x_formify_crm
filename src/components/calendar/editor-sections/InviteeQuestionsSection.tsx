"use client";

import { useMemo, useState } from "react";
import { EventType, InviteeQuestion } from "@/types/scheduling";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, GripVertical, CheckSquare2, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { useRouter } from "next/navigation";

const PLAN_LIMITS: Record<string, { max: number | null; ctaLabel: string }> = {
  preview: { max: 0, ctaLabel: "Upgrade to Solo or Pro" },
  solo: { max: 3, ctaLabel: "Upgrade to Pro" },
  pro: { max: null, ctaLabel: "" },
  expert: { max: null, ctaLabel: "" },
};

interface InviteeQuestionsSectionProps {
  data: Partial<EventType>;
  onChange: (updates: Partial<EventType>) => void;
}

export const InviteeQuestionsSection = ({ data, onChange }: InviteeQuestionsSectionProps) => {
  const router = useRouter();
  const { entitlements } = useEntitlements();
  const plan = entitlements?.plan_id ?? "preview";
  const { max, ctaLabel } = PLAN_LIMITS[plan] ?? PLAN_LIMITS.preview;
  const isFreePlan = plan === "preview";
  const isSoloPlan = plan === "solo";
  const questions = data.invitee_form_schema || [];
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const limitReached = useMemo(() => {
    if (max === null) return false;
    return questions.length >= max;
  }, [questions.length, max]);

  const addQuestion = () => {
    if (max !== null && questions.length >= max) return;
    const newQuestion: InviteeQuestion = {
      id: `q_${Date.now()}`,
      type: "short_text",
      label: "",
      required: false,
    };
    onChange({ invitee_form_schema: [...questions, newQuestion] });
  };

    const sanitizeCorrectOptions = (options: string[] | undefined, correct?: string[]) => {
    if (!options || !correct) return correct;
    const optionSet = new Set(options.filter(Boolean));
    return correct.filter((option) => optionSet.has(option));
  };

  const updateQuestion = (id: string, updates: Partial<InviteeQuestion>) => {
    onChange({
      invitee_form_schema: questions.map((q) => {
        if (q.id !== id) return q;
        let next: InviteeQuestion = { ...q, ...updates };

        if (updates.type) {
          const needsOptions = ["dropdown", "multi_select", "checkbox"].includes(updates.type);
          if (needsOptions && !next.options) {
            next = { ...next, options: [""] };
          }
          if (!needsOptions) {
            next = { ...next, options: undefined };
          }
          if (updates.type !== "multi_select") {
            next = { ...next, maxSelections: null };
          }
          if (updates.type !== "checkbox") {
            next = { ...next, quizMode: false, correctOptions: [] };
          }
        }

        if (!next.quizMode) {
          next = { ...next, correctOptions: [] };
        }

        next = {
          ...next,
          correctOptions: sanitizeCorrectOptions(next.options, next.correctOptions),
        };

        return next;
      }),
    });
  };

  const deleteQuestion = (id: string) => {
    onChange({
      invitee_form_schema: questions.filter(q => q.id !== id),
    });
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.options) return;
    
    const previousValue = question.options[index];
    const newOptions = [...question.options];
    newOptions[index] = value;
    let correctOptions = question.correctOptions;
    if (correctOptions?.length && previousValue && previousValue !== value) {
      correctOptions = correctOptions.map((opt) => (opt === previousValue ? value : opt));
    }
    updateQuestion(questionId, { options: newOptions, correctOptions });
  };

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    updateQuestion(questionId, { 
      options: [...(question.options || []), ""] 
    });
  };

  const deleteOption = (questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.options) return;
    
    const optionValue = question.options[index];
    const remainingOptions = question.options.filter((_, i) => i !== index);
    const remainingCorrect = question.correctOptions?.filter((opt) => opt !== optionValue);
    updateQuestion(questionId, { 
      options: remainingOptions,
      correctOptions: remainingCorrect,
    });
  };

  const toggleCorrectOption = (questionId: string, optionValue: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;
    const current = question.correctOptions || [];
    const exists = current.includes(optionValue);
    const updated = exists ? current.filter((opt) => opt !== optionValue) : [...current, optionValue];
    updateQuestion(questionId, { correctOptions: updated });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newQuestions = [...questions];
    const draggedItem = newQuestions[draggedIndex];
    newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(index, 0, draggedItem);
    
    onChange({ invitee_form_schema: newQuestions });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const goToPricing = () => router.push("/pricing");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Name and Email are always collected automatically.
        </p>

        {(isFreePlan || isSoloPlan) && (
          <Alert className="bg-muted/40 border-dashed">
            <Star className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">
              {isFreePlan ? "Upgrade to unlock invitee questions" : "Upgrade for more questions"}
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              {isFreePlan
                ? "Free plan workspaces can’t add custom invitee questions yet. Upgrade to Solo or Pro to collect the info you need."
                : "Solo plans can add up to three custom questions per event type. Upgrade to Pro for unlimited questions."}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={goToPricing}>
                  View pricing
                </Button>
                {isFreePlan && (
                  <Button size="sm" variant="secondary" onClick={goToPricing}>
                    Upgrade to Solo or Pro
                  </Button>
                )}
                {isSoloPlan && (
                  <Button size="sm" variant="secondary" onClick={goToPricing}>
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className={cn("space-y-4", max === 0 && "pointer-events-none opacity-60")}> 
        {questions.map((question, index) => (
          <Card 
            key={question.id} 
            className="p-4 space-y-4 cursor-move"
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-start gap-2">
              <GripVertical className="w-4 h-4 mt-2 text-muted-foreground cursor-grab active:cursor-grabbing" />
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Question Type</Label>
                    <Select
                      value={question.type}
                      onValueChange={(value) => {
                        const updates: Partial<InviteeQuestion> = { type: value as any };
                        if (['dropdown', 'multi_select', 'checkbox'].includes(value) && !question.options) {
                          updates.options = [''];
                        }
                        updateQuestion(question.id, updates);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short_text">Short Text</SelectItem>
                        <SelectItem value="long_text">Long Text</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="dropdown">Dropdown</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="multi_select">Multi-Select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Required</Label>
                    <Switch
                      checked={question.required}
                      onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Question Label</Label>
                  <Input
                    value={question.label}
                    onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                    placeholder="What would you like to discuss?"
                  />
                </div>

                <div>
                  <Label className="text-xs">Placeholder Text</Label>
                  <Input
                    value={question.placeholder || ""}
                    onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                    placeholder="Optional placeholder..."
                  />
                </div>

                {(['dropdown', 'multi_select', 'checkbox'].includes(question.type)) && (
                  <div className="space-y-2">
                    <Label className="text-xs">Options</Label>
                    {question.options?.map((option, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        {question.type === "checkbox" && question.quizMode && (
                          <Checkbox
                            checked={question.correctOptions?.includes(option) || false}
                            onCheckedChange={() => toggleCorrectOption(question.id, option)}
                            className="mr-2"
                            aria-label="Mark as correct"
                          />
                        )}
                        <Input
                          value={option}
                          onChange={(e) => updateOption(question.id, idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteOption(question.id, idx)}
                          disabled={question.options!.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(question.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                )}

                {question.helper_text !== undefined && (
                  <div>
                    <Label className="text-xs">Helper Text</Label>
                    <Input
                      value={question.helper_text}
                      onChange={(e) => updateQuestion(question.id, { helper_text: e.target.value })}
                      placeholder="Additional help text..."
                    />
                  </div>
                )}

                {question.type === "multi_select" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Max Selections</Label>
                    <Input
                      type="number"
                      min={1}
                      value={question.maxSelections ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Math.max(1, Number(e.target.value)) : null;
                        updateQuestion(question.id, { maxSelections: val });
                      }}
                      placeholder="Unlimited"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank for unlimited selections.
                    </p>
                  </div>
                )}

                {question.type === "checkbox" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-2">
                        <CheckSquare2 className="w-4 h-4" /> Quiz mode
                      </Label>
                      <Switch
                        checked={question.quizMode || false}
                        onCheckedChange={(checked) => updateQuestion(question.id, { quizMode: checked })}
                      />
                    </div>
                    {question.quizMode && (
                      <p className="text-xs text-muted-foreground">
                        Mark which option(s) are correct. Invitees see regular checkboxes; use responses for scoring later.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Button
        variant={limitReached ? "secondary" : "outline"}
        onClick={limitReached ? goToPricing : addQuestion}
        className="w-full"
        disabled={max === 0}
      >
        {limitReached ? (
          <>
            <Star className="w-4 h-4 mr-2" />
            {ctaLabel || "Upgrade for more questions"}
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </>
        )}
      </Button>
    </div>
  );
};
