"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { InviteeQuestion } from "@/types/scheduling";

interface InviteeQuestionsProps {
  questions: InviteeQuestion[];
  answers: Record<string, any>;
  onAnswerChange: (questionId: string, value: any) => void;
}

export const InviteeQuestions = ({ questions, answers, onAnswerChange }: InviteeQuestionsProps) => {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <div key={question.id}>
          <Label htmlFor={question.id}>
            {question.label}
            {question.required && <span className="text-destructive"> *</span>}
          </Label>
          {question.helper_text && (
            <p className="text-sm text-muted-foreground mb-2">{question.helper_text}</p>
          )}

          {question.type === 'short_text' && (
            <Input
              id={question.id}
              value={answers[question.id] || ''}
              onChange={(e) => onAnswerChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              required={question.required}
            />
          )}

          {question.type === 'long_text' && (
            <Textarea
              id={question.id}
              value={answers[question.id] || ''}
              onChange={(e) => onAnswerChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              required={question.required}
              rows={4}
            />
          )}

          {question.type === 'email' && (
            <Input
              id={question.id}
              type="email"
              value={answers[question.id] || ''}
              onChange={(e) => onAnswerChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              required={question.required}
            />
          )}

          {question.type === 'phone' && (
            <Input
              id={question.id}
              type="tel"
              value={answers[question.id] || ''}
              onChange={(e) => onAnswerChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              required={question.required}
            />
          )}

          {question.type === 'dropdown' && (
            <Select 
              value={answers[question.id] || ''} 
              onValueChange={(value) => onAnswerChange(question.id, value)}
              required={question.required}
            >
              <SelectTrigger id={question.id}>
                <SelectValue placeholder={question.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {question.type === 'checkbox' && (
            question.options?.length ? (
              <div className="space-y-2">
                {question.options.map((option) => {
                  const selected = typeof answers[question.id] === "string" ? answers[question.id] : "";
                  const checked = selected === option;
                  const handleChange = (value: boolean) => {
                    if (value) {
                      onAnswerChange(question.id, option);
                    } else {
                      onAnswerChange(question.id, null);
                    }
                  };
                  return (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${question.id}-${option}`}
                        checked={checked}
                        onCheckedChange={(value) => handleChange(Boolean(value))}
                      />
                      <label
                        htmlFor={`${question.id}-${option}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option}
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={question.id}
                  checked={Boolean(answers[question.id])}
                  onCheckedChange={(checked) => onAnswerChange(question.id, checked)}
                  required={question.required}
                />
                <label
                  htmlFor={question.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {question.placeholder || "I agree"}
                </label>
              </div>
            )
          )}

          {question.type === 'multi_select' && (
            <div className="space-y-2">
              {question.options?.map((option) => {
                const selections: string[] = Array.isArray(answers[question.id]) ? answers[question.id] : [];
                const maxSelections = typeof question.maxSelections === "number" ? question.maxSelections : null;
                const isAtLimit = maxSelections !== null && selections.length >= maxSelections;
                const checked = selections.includes(option);
                const handleChange = (value: boolean) => {
                  const current = selections;
                  if (value) {
                    if (maxSelections === null || current.length < maxSelections) {
                      onAnswerChange(question.id, [...current, option]);
                    }
                  } else {
                    onAnswerChange(question.id, current.filter((v) => v !== option));
                  }
                };
                return (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${question.id}-${option}`}
                      checked={checked}
                      disabled={!checked && isAtLimit}
                      onCheckedChange={(value) => handleChange(Boolean(value))}
                    />
                    <label
                      htmlFor={`${question.id}-${option}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option}
                    </label>
                  </div>
                );
              })}
              {typeof question.maxSelections === "number" && (
                <p className="text-xs text-muted-foreground">
                  Select up to {question.maxSelections} option{question.maxSelections === 1 ? "" : "s"}.
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
