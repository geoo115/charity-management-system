// Advanced Analytics API for Donor Impact Tracking
// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export interface DonorAnalytics {
  overview: {
    totalDonated: number;
    donationCount: number;
    averageDonation: number;
    impactScore: number;
    peopleHelped: number;
    organizationsSupported: number;
  };
  trends: {
    monthlyDonations: Array<{
      month: string;
      amount: number;
      count: number;
    }>;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    impactOverTime: Array<{
      date: string;
      score: number;
      peopleHelped: number;
    }>;
  };
  comparisons: {
    percentileRank: number;
    averageDonorComparison: {
      myAmount: number;
      averageAmount: number;
      difference: number;
    };
    goalProgress: {
      currentAmount: number;
      targetAmount: number;
      percentage: number;
    };
  };
  predictions: {
    nextMonthPrediction: number;
    yearEndProjection: number;
    impactForecast: number;
  };
}

export interface ImpactMetrics {
  directImpact: {
    mealsProvided: number;
    peopleHoused: number;
    childrenEducated: number;
    familiesSupported: number;
  };
  communityImpact: {
    programsSupported: number;
    volunteersEnabled: number;
    eventsOrganized: number;
    partnershipsFacilitated: number;
  };
  environmentalImpact: {
    wasteReduced: number; // in kg
    carbonOffsetEquivalent: number; // in kg CO2
    resourcesSaved: number;
  };
  socialImpact: {
    livesImproved: number;
    communitiesReached: number;
    sustainabilityScore: number;
  };
}

export interface DonationInsights {
  patterns: {
    preferredDonationTime: string;
    averageFrequency: number;
    seasonalTrends: Array<{
      season: string;
      amount: number;
      frequency: number;
    }>;
  };
  recommendations: {
    suggestedAmount: number;
    optimalFrequency: string;
    impactfulCategories: string[];
    taxOptimization: {
      currentTaxBenefit: number;
      potentialSavings: number;
      recommendations: string[];
    };
  };
  achievements: {
    milestones: Array<{
      id: string;
      title: string;
      description: string;
      achievedAt: string;
      badge: string;
    }>;
    streaks: {
      current: number;
      longest: number;
      type: 'monthly' | 'weekly' | 'daily';
    };
  };
}

export interface BenchmarkData {
  category: string;
  myPerformance: number;
  averagePerformance: number;
  topPerformerPercentile: number;
  rank: number;
  totalParticipants: number;
}

// Fetch comprehensive donor analytics
export const getDonorAnalytics = async (): Promise<DonorAnalytics> => {
  try {
    const response = await fetch('/api/v1/analytics/donor/comprehensive', {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch donor analytics');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching donor analytics:', error);
    throw error;
  }
};

// Fetch detailed impact metrics
export const getImpactMetrics = async (): Promise<ImpactMetrics> => {
  try {
    const response = await fetch('/api/v1/analytics/impact/detailed', {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch impact metrics');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching impact metrics:', error);
    throw error;
  }
};

// Fetch donation insights and recommendations
export const getDonationInsights = async (): Promise<DonationInsights> => {
  try {
    const response = await fetch('/api/v1/analytics/insights', {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch donation insights');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching donation insights:', error);
    throw error;
  }
};

// Fetch benchmark data
export const getBenchmarkData = async (category?: string): Promise<BenchmarkData[]> => {
  try {
    const url = category 
      ? `/api/v1/analytics/benchmarks?category=${category}`
      : '/api/v1/analytics/benchmarks';
      
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch benchmark data');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching benchmark data:', error);
    throw error;
  }
};

// Generate personalized donation report
export const generateDonationReport = async (
  startDate: string,
  endDate: string,
  format: 'pdf' | 'csv' | 'json' = 'pdf'
): Promise<Blob> => {
  try {
    const response = await fetch('/api/v1/analytics/report', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        format,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate donation report');
    }

    return response.blob();
  } catch (error) {
    console.error('Error generating donation report:', error);
    throw error;
  }
};

// Track donation goal progress
export const trackGoalProgress = async (goalId: string): Promise<any> => {
  try {
    const response = await fetch(`/api/v1/analytics/goals/${goalId}/progress`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch goal progress');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching goal progress:', error);
    throw error;
  }
};

// Set donation goal
export const setDonationGoal = async (goal: {
  targetAmount: number;
  targetDate: string;
  category?: string;
  description?: string;
}): Promise<any> => {
  try {
    const response = await fetch('/api/v1/analytics/goals', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goal),
    });

    if (!response.ok) {
      throw new Error('Failed to set donation goal');
    }

    return response.json();
  } catch (error) {
    console.error('Error setting donation goal:', error);
    throw error;
  }
};

// Get donation predictions using ML
export const getDonationPredictions = async (): Promise<{
  nextDonationPrediction: {
    amount: number;
    probability: number;
    suggestedDate: string;
  };
  yearlyProjection: {
    totalAmount: number;
    confidence: number;
    factors: string[];
  };
  impactProjection: {
    estimatedImpact: number;
    comparisonToLastYear: number;
  };
}> => {
  try {
    const response = await fetch('/api/v1/analytics/predictions', {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch donation predictions');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching donation predictions:', error);
    throw error;
  }
};

// Get tax optimization suggestions
export const getTaxOptimization = async (): Promise<{
  currentTaxBenefit: number;
  potentialAdditionalBenefit: number;
  suggestions: Array<{
    strategy: string;
    description: string;
    potentialSaving: number;
    difficulty: 'easy' | 'medium' | 'complex';
  }>;
  giftAidEligibility: boolean;
  charitableDeductionLimit: number;
}> => {
  try {
    const response = await fetch('/api/v1/analytics/tax-optimization', {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tax optimization data');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching tax optimization:', error);
    throw error;
  }
};

// Submit feedback on impact data
export const submitImpactFeedback = async (feedback: {
  rating: number;
  comment: string;
  category: string;
  suggestions?: string;
}): Promise<void> => {
  try {
    const response = await fetch('/api/v1/analytics/feedback', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      throw new Error('Failed to submit feedback');
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
};

// Export all analytics functions
export default {
  getDonorAnalytics,
  getImpactMetrics,
  getDonationInsights,
  getBenchmarkData,
  generateDonationReport,
  trackGoalProgress,
  setDonationGoal,
  getDonationPredictions,
  getTaxOptimization,
  submitImpactFeedback,
}; 