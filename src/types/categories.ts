export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
}

export interface GoalCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: 'revenue' | 'sales' | 'profit' | 'clients' | 'custom';
}

export const DEFAULT_REVENUE_CATEGORIES: Category[] = [
  {
    id: 'calls',
    name: 'Calls',
    color: 'hsl(142, 76%, 36%)', // green
    icon: 'Phone',
    description: 'Revenue from sales calls and consultations'
  },
  {
    id: 'stan-store',
    name: 'Stan Store',
    color: 'hsl(262, 83%, 58%)', // purple
    icon: 'Store',
    description: 'Sales from Stan Store platform'
  },
  {
    id: 'whop',
    name: 'Whop',
    color: 'hsl(32, 95%, 44%)', // orange
    icon: 'ShoppingBag',
    description: 'Sales from Whop marketplace'
  },
  {
    id: 'consulting',
    name: 'Consulting',
    color: 'hsl(221, 83%, 53%)', // blue
    icon: 'Users',
    description: 'Consulting and advisory services'
  },
  {
    id: 'subscription',
    name: 'Subscription',
    color: 'hsl(173, 58%, 39%)', // teal
    icon: 'CreditCard',
    description: 'Recurring subscription income'
  },
  {
    id: 'freelance',
    name: 'Freelance',
    color: 'hsl(195, 100%, 50%)', // light blue
    icon: 'Briefcase',
    description: 'Freelance project work'
  },
  {
    id: 'investment',
    name: 'Investment',
    color: 'hsl(120, 60%, 50%)', // lime green
    icon: 'TrendingUp',
    description: 'Investment returns and dividends'
  },
  {
    id: 'invoice-payment',
    name: 'Invoice Payment',
    color: 'hsl(280, 65%, 60%)', // purple-pink
    icon: 'FileText',
    description: 'Payments received from invoices'
  },
  {
    id: 'other',
    name: 'Other',
    color: 'hsl(215, 20%, 65%)', // gray
    icon: 'Circle',
    description: 'Other revenue sources'
  }
];

export const DEFAULT_GOAL_CATEGORIES: GoalCategory[] = [
  {
    id: 'revenue',
    name: 'Revenue',
    color: 'hsl(142, 76%, 36%)',
    icon: 'PoundSterling',
    type: 'revenue'
  },
  {
    id: 'sales_volume',
    name: 'Sales Volume',
    color: 'hsl(221, 83%, 53%)',
    icon: 'ShoppingCart',
    type: 'sales'
  },
  {
    id: 'profit',
    name: 'Profit',
    color: 'hsl(262, 83%, 58%)',
    icon: 'TrendingUp',
    type: 'profit'
  },
  {
    id: 'clients',
    name: 'New Clients',
    color: 'hsl(32, 95%, 44%)',
    icon: 'Users',
    type: 'clients'
  },
  {
    id: 'growth',
    name: 'Growth Rate',
    color: 'hsl(173, 58%, 39%)',
    icon: 'BarChart3',
    type: 'custom'
  }
];

export type FilterCriteria = {
  dateRange: {
    from?: Date;
    to?: Date;
  };
  categories: string[];
  amountRange: {
    min?: number;
    max?: number;
  };
  searchTerm?: string;
};

export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  targetAmount: number;
  category: string;
  icon: string;
  color: string;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'monthly_revenue_5k',
    name: '£5K Monthly Revenue',
    description: 'Achieve £5,000 in total revenue this month',
    type: 'monthly',
    targetAmount: 5000,
    category: 'revenue',
    icon: 'PoundSterling',
    color: 'hsl(142, 76%, 36%)'
  },
  {
    id: 'weekly_sales_1k',
    name: '£1K Weekly Sales',
    description: 'Generate £1,000 in sales this week',
    type: 'weekly',
    targetAmount: 1000,
    category: 'sales_volume',
    icon: 'ShoppingCart',
    color: 'hsl(221, 83%, 53%)'
  },
  {
    id: 'daily_target_200',
    name: '£200 Daily Target',
    description: 'Earn £200 in revenue today',
    type: 'daily',
    targetAmount: 200,
    category: 'revenue',
    icon: 'Target',
    color: 'hsl(32, 95%, 44%)'
  },
  {
    id: 'yearly_growth_50k',
    name: '£50K Annual Goal',
    description: 'Reach £50,000 in total revenue this year',
    type: 'yearly',
    targetAmount: 50000,
    category: 'revenue',
    icon: 'TrendingUp',
    color: 'hsl(262, 83%, 58%)'
  },
  // Client Goals
  {
    id: 'monthly_clients_10',
    name: '10 New Clients Monthly',
    description: 'Acquire 10 new clients this month',
    type: 'monthly',
    targetAmount: 10,
    category: 'clients',
    icon: 'Users',
    color: 'hsl(173, 58%, 39%)'
  },
  {
    id: 'weekly_clients_3',
    name: '3 New Clients Weekly',
    description: 'Gain 3 new clients this week',
    type: 'weekly',
    targetAmount: 3,
    category: 'clients',
    icon: 'UserPlus',
    color: 'hsl(221, 83%, 53%)'
  },
  {
    id: 'yearly_clients_100',
    name: '100 New Clients Yearly',
    description: 'Reach 100 new clients this year',
    type: 'yearly',
    targetAmount: 100,
    category: 'clients',
    icon: 'Users',
    color: 'hsl(262, 83%, 58%)'
  }
];