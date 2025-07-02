export const fetchDonorStats = async () => {
  const response = await fetch('/api/v1/donor/stats', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch donor stats');
  }
  
  return response.json();
};

export const submitMonetaryDonation = async (data: any) => {
  const response = await fetch('/api/v1/donations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit donation');
  }
  
  return response.json();
};

export const fetchDonorDashboard = async () => {
  const response = await fetch('/api/v1/donor/dashboard', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to load dashboard data');
  }
  
  return response.json();
};

export const fetchDonorHistory = async () => {
  const response = await fetch('/api/v1/donor/history', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to load donation history');
  }
  
  return response.json();
};

export const fetchDonorImpact = async () => {
  const response = await fetch('/api/v1/donor/impact', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to load impact data');
  }
  
  return response.json();
};

export const fetchDonorRecognition = async () => {
  const response = await fetch('/api/v1/donor/recognition', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to load recognition data');
  }
  
  return response.json();
};

export const fetchDonorProfile = async () => {
  const response = await fetch('/api/v1/donor/profile', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to load profile data');
  }
  
  return response.json();
};
