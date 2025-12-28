"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, PoundSterling } from "lucide-react";
import { RevenueEntry } from "@/types/revenue";
import { DEFAULT_REVENUE_CATEGORIES } from "@/types/categories";

interface RevenueEntryFormProps {
  onAddEntry: (entry: Omit<RevenueEntry, 'id' | 'createdAt'>) => Promise<void>;
}

export const RevenueEntryForm = ({ onAddEntry }: RevenueEntryFormProps) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0 || isSubmitting) {
      return;
    }

    const selectedCategory = DEFAULT_REVENUE_CATEGORIES.find(cat => cat.id === category);
    
    setIsSubmitting(true);
    try {
      await onAddEntry({
        date,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        categoryName: selectedCategory?.name,
        categoryColor: selectedCategory?.color,
      });
      
      // Reset form
      setAmount("");
      setDescription("");
      setCategory("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="card-smooth">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Revenue Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (£)</Label>
              <div className="relative">
                <PoundSterling className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_REVENUE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any notes about this revenue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          <Button type="submit" className="w-full button-smooth" disabled={isSubmitting}>
            <Plus className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Adding...' : 'Add Revenue Entry'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
