'use client';

import { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AwardIcon, 
  StarIcon, 
  TrophyIcon,
  TargetIcon,
  HeartIcon,
  GiftIcon,
  CrownIcon,
  CheckCircleIcon,
  LockIcon,
  TrendingUpIcon,
  CalendarIcon,
  UsersIcon
} from 'lucide-react';
import { fetchDonorRecognition } from '@/lib/api/donor';
import LoadingSpinner from '@/components/common/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion } from 'framer-motion';

export default function DonorRecognitionPage() {
  const [recognitionData, setRecognitionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecognition = async () => {
      try {
        const data = await fetchDonorRecognition();
        setRecognitionData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load recognition data');
        console.error('Recognition error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRecognition();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading your recognition..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const { currentLevel, badges, achievements } = recognitionData;

  const getLevelIcon = (levelName: string) => {
    switch (levelName) {
      case 'Community Legend': return StarIcon;
      case 'Community Guardian': return CrownIcon;
      case 'Community Hero': return TrophyIcon;
      case 'Community Champion': return TargetIcon;
      default: return GiftIcon;
    }
  };

  const getLevelColor = (levelName: string) => {
    switch (levelName) {
      case 'Community Legend': return 'text-yellow-600 bg-yellow-50';
      case 'Community Guardian': return 'text-purple-600 bg-purple-50';
      case 'Community Hero': return 'text-red-600 bg-red-50';
      case 'Community Champion': return 'text-blue-600 bg-blue-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const LevelIcon = getLevelIcon(currentLevel.name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recognition & Achievements</h1>
          <p className="text-muted-foreground mt-2">
            Celebrate your generosity and community impact
          </p>
        </div>
      </motion.div>

      {/* Current Level */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-700">
              <AwardIcon className="h-5 w-5 mr-2" />
              Your Current Level
            </CardTitle>
            <CardDescription className="text-yellow-600">
              {currentLevel.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className={`p-4 rounded-full ${getLevelColor(currentLevel.name).split(' ')[1]}`}>
                  <LevelIcon className="h-12 w-12 text-yellow-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-yellow-700">{currentLevel.name}</h2>
                <p className="text-yellow-600 mt-1">{currentLevel.description}</p>
              </div>
              
              {currentLevel.nextLevel && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress to {currentLevel.nextLevel}</span>
                    <span>{currentLevel.progress}%</span>
                  </div>
                  <Progress value={currentLevel.progress} className="h-2" />
                  <p className="text-xs text-yellow-600">
                    £{currentLevel.nextLevelRequirement} needed for next level
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Badges */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <StarIcon className="h-5 w-5 mr-2" />
              Achievement Badges
            </CardTitle>
            <CardDescription>
              Collect badges by reaching donation milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges.map((badge: any, index: number) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`text-center p-4 rounded-lg border-2 transition-all ${
                    badge.earned 
                      ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="text-3xl mb-2">
                    {badge.icon}
                  </div>
                  <h3 className="font-medium text-sm mb-1">{badge.name}</h3>
                  {badge.earned ? (
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-xs">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Earned
                      </Badge>
                      {badge.date && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(badge.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-xs">
                        <LockIcon className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                      {badge.requirement && (
                        <p className="text-xs text-muted-foreground">
                          {badge.requirement}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievements */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrophyIcon className="h-5 w-5 mr-2" />
              Special Achievements
            </CardTitle>
            <CardDescription>
              Milestone achievements and special accomplishments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {achievements.map((achievement: any) => (
                <motion.div
                  key={achievement.id || `achievement-${achievement.name}-${achievement.date}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center p-4 rounded-lg border-2 bg-white hover:bg-gray-50 transition-all"
                >
                  <div className={`p-2 rounded-full ${
                    achievement.earned 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {achievement.earned ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <LockIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{achievement.name}</h3>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Badge variant={achievement.earned ? "default" : "secondary"}>
                    {achievement.earned ? "Completed" : "Locked"}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recognition Levels Info */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUpIcon className="h-5 w-5 mr-2" />
              Recognition Levels
            </CardTitle>
            <CardDescription>
              Progress through different donor recognition tiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <GiftIcon className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h4 className="font-medium text-sm">Community Supporter</h4>
                  <p className="text-xs text-muted-foreground">£50+ donated</p>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <TargetIcon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h4 className="font-medium text-sm">Community Champion</h4>
                  <p className="text-xs text-muted-foreground">£250+ donated</p>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <HeartIcon className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <h4 className="font-medium text-sm">Community Hero</h4>
                  <p className="text-xs text-muted-foreground">£500+ donated</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <CrownIcon className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <h4 className="font-medium text-sm">Community Guardian</h4>
                  <p className="text-xs text-muted-foreground">£1,000+ donated</p>
                </div>
                
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <StarIcon className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <h4 className="font-medium text-sm">Community Legend</h4>
                  <p className="text-xs text-muted-foreground">£2,500+ donated</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Community Impact Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-slate-50 to-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UsersIcon className="h-5 w-5 mr-2" />
              Community Recognition
            </CardTitle>
            <CardDescription>
              Your standing in the donor community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-primary">
                Top 10%
              </div>
              <p className="text-muted-foreground">
                You're among the most generous donors in the Lewisham community
              </p>
              <div className="flex justify-center space-x-2">
                <Badge className="text-lg px-4 py-2">
                  🏆 {badges.filter((b: any) => b.earned).length} Badges Earned
                </Badge>
                <Badge className="text-lg px-4 py-2">
                  ⭐ {achievements.filter((a: any) => a.earned).length} Achievements
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
