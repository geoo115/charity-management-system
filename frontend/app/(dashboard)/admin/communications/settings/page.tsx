'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Settings,
  Mail,
  MessageSquare,
  Bell,
  Clock,
  Users,
  Shield,
  Zap,
  CheckCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Globe,
  Smartphone,
  Monitor,
  Database,
  Key,
  Lock,
  Server
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';

interface CommunicationSettings {
  emailSettings: {
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromAddress: string;
    fromName: string;
    replyToAddress: string;
    maxAttachmentSize: number;
    dailyLimit: number;
    hourlyLimit: number;
  };
  smsSettings: {
    provider: 'twilio' | 'aws' | 'custom';
    apiKey: string;
    apiSecret: string;
    fromNumber: string;
    dailyLimit: number;
    costPerMessage: number;
    enableDeliveryReceipts: boolean;
  };
  pushSettings: {
    webPushEnabled: boolean;
    fcmServerKey: string;
    vapidPublicKey: string;
    vapidPrivateKey: string;
    defaultIcon: string;
    clickAction: string;
  };
  automationRules: AutomationRule[];
  messageDefaults: {
    defaultTemplate: string;
    defaultSender: string;
    includeUnsubscribeLink: boolean;
    trackOpens: boolean;
    trackClicks: boolean;
    enableRetries: boolean;
    retryAttempts: number;
  };
  compliance: {
    gdprCompliant: boolean;
    canSpamCompliant: boolean;
    requireOptIn: boolean;
    autoDeleteAfterDays: number;
    allowAnonymousMessaging: boolean;
  };
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: 'user_registered' | 'document_verified' | 'help_request_approved' | 'volunteer_assigned' | 'custom';
  conditions: {
    userType?: string[];
    status?: string;
    delay?: number; // in minutes
  };
  action: {
    type: 'send_email' | 'send_sms' | 'send_push' | 'create_notification';
    template: string;
    channel: 'email' | 'sms' | 'push' | 'in_app';
  };
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export default function CommunicationSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<CommunicationSettings | null>(null);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockSettings: CommunicationSettings = {
        emailSettings: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUsername: 'noreply@lewishamCharity.org',
          smtpPassword: '***********',
          smtpSecure: true,
          fromAddress: 'noreply@lewishamCharity.org',
          fromName: 'Lewishame Charity',
          replyToAddress: 'support@lewishamCharity.org',
          maxAttachmentSize: 10485760, // 10MB
          dailyLimit: 1000,
          hourlyLimit: 100
        },
        smsSettings: {
          provider: 'twilio',
          apiKey: 'AC***********',
          apiSecret: '***********',
          fromNumber: '+441234567890',
          dailyLimit: 500,
          costPerMessage: 0.05,
          enableDeliveryReceipts: true
        },
        pushSettings: {
          webPushEnabled: true,
          fcmServerKey: '***********',
          vapidPublicKey: 'BF***********',
          vapidPrivateKey: '***********',
          defaultIcon: '/icon-192.png',
          clickAction: 'https://lewishamCharity.org/notifications'
        },
        automationRules: [
          {
            id: '1',
            name: 'Welcome New Users',
            description: 'Send welcome email to newly registered users',
            trigger: 'user_registered',
            conditions: {
              userType: ['visitor', 'volunteer'],
              delay: 5
            },
            action: {
              type: 'send_email',
              template: 'welcome-new-user',
              channel: 'email'
            },
            enabled: true,
            createdAt: '2024-01-01T00:00:00Z',
            lastTriggered: '2024-01-15T10:30:00Z',
            triggerCount: 156
          },
          {
            id: '2',
            name: 'Document Verification Notification',
            description: 'Notify users when their documents are verified',
            trigger: 'document_verified',
            conditions: {
              delay: 0
            },
            action: {
              type: 'send_email',
              template: 'document-verified',
              channel: 'email'
            },
            enabled: true,
            createdAt: '2024-01-01T00:00:00Z',
            lastTriggered: '2024-01-15T15:45:00Z',
            triggerCount: 89
          }
        ],
        messageDefaults: {
          defaultTemplate: 'default-notification',
          defaultSender: 'Lewishame Charity',
          includeUnsubscribeLink: true,
          trackOpens: true,
          trackClicks: true,
          enableRetries: true,
          retryAttempts: 3
        },
        compliance: {
          gdprCompliant: true,
          canSpamCompliant: true,
          requireOptIn: true,
          autoDeleteAfterDays: 365,
          allowAnonymousMessaging: false
        }
      };

      setSettings(mockSettings);
    } catch (error) {
      console.error('Error loading communication settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load communication settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Settings Saved',
        description: 'Communication settings have been updated successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save communication settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (type: 'email' | 'sms' | 'push') => {
    try {
      // Mock test connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Connection Test',
        description: `${type.toUpperCase()} connection test successful`,
      });
    } catch (error) {
      toast({
        title: 'Connection Test Failed',
        description: `Failed to connect to ${type.toUpperCase()} service`,
        variant: 'destructive',
      });
    }
  };

  const toggleSecret = (field: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const addAutomationRule = () => {
    setEditingRule({
      id: '',
      name: '',
      description: '',
      trigger: 'user_registered',
      conditions: { delay: 0 },
      action: {
        type: 'send_email',
        template: '',
        channel: 'email'
      },
      enabled: true,
      createdAt: new Date().toISOString(),
      triggerCount: 0
    });
    setIsRuleDialogOpen(true);
  };

  const editAutomationRule = (rule: AutomationRule) => {
    setEditingRule({ ...rule });
    setIsRuleDialogOpen(true);
  };

  const saveAutomationRule = () => {
    if (!editingRule || !settings) return;

    const updatedRules = editingRule.id 
      ? settings.automationRules.map(rule => rule.id === editingRule.id ? editingRule : rule)
      : [...settings.automationRules, { ...editingRule, id: Date.now().toString() }];

    setSettings({
      ...settings,
      automationRules: updatedRules
    });

    setIsRuleDialogOpen(false);
    setEditingRule(null);

    toast({
      title: 'Rule Saved',
      description: 'Automation rule has been saved successfully',
    });
  };

  const deleteAutomationRule = (ruleId: string) => {
    if (!settings) return;

    setSettings({
      ...settings,
      automationRules: settings.automationRules.filter(rule => rule.id !== ruleId)
    });

    toast({
      title: 'Rule Deleted',
      description: 'Automation rule has been deleted successfully',
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading communication settings..." />;
  }

  if (!settings) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>No settings data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link 
              href="/admin/communications" 
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              ← Back to Communications
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Communication Settings</h1>
          <p className="text-gray-600">Configure messaging channels and automation rules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="push">Push Notifications</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure SMTP settings for email delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    value={settings.emailSettings.smtpHost}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailSettings: { ...settings.emailSettings, smtpHost: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={settings.emailSettings.smtpPort}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailSettings: { ...settings.emailSettings, smtpPort: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-username">Username</Label>
                  <Input
                    id="smtp-username"
                    value={settings.emailSettings.smtpUsername}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailSettings: { ...settings.emailSettings, smtpUsername: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Password</Label>
                  <div className="flex">
                    <Input
                      id="smtp-password"
                      type={showSecrets['smtp-password'] ? 'text' : 'password'}
                      value={settings.emailSettings.smtpPassword}
                      onChange={(e) => setSettings({
                        ...settings,
                        emailSettings: { ...settings.emailSettings, smtpPassword: e.target.value }
                      })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => toggleSecret('smtp-password')}
                    >
                      {showSecrets['smtp-password'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-address">From Address</Label>
                  <Input
                    id="from-address"
                    type="email"
                    value={settings.emailSettings.fromAddress}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailSettings: { ...settings.emailSettings, fromAddress: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    value={settings.emailSettings.fromName}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailSettings: { ...settings.emailSettings, fromName: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="smtp-secure"
                  checked={settings.emailSettings.smtpSecure}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    emailSettings: { ...settings.emailSettings, smtpSecure: checked }
                  })}
                />
                <Label htmlFor="smtp-secure">Use secure connection (TLS/SSL)</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-limit">Daily Send Limit</Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    value={settings.emailSettings.dailyLimit}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailSettings: { ...settings.emailSettings, dailyLimit: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly-limit">Hourly Send Limit</Label>
                  <Input
                    id="hourly-limit"
                    type="number"
                    value={settings.emailSettings.hourlyLimit}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailSettings: { ...settings.emailSettings, hourlyLimit: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <Button variant="outline" onClick={() => testConnection('email')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Test Email Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                SMS Configuration
              </CardTitle>
              <CardDescription>
                Configure SMS service provider settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sms-provider">SMS Provider</Label>
                <Select
                  value={settings.smsSettings.provider}
                  onValueChange={(value: 'twilio' | 'aws' | 'custom') => setSettings({
                    ...settings,
                    smsSettings: { ...settings.smsSettings, provider: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="aws">AWS SNS</SelectItem>
                    <SelectItem value="custom">Custom Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sms-api-key">API Key</Label>
                  <div className="flex">
                    <Input
                      id="sms-api-key"
                      type={showSecrets['sms-api-key'] ? 'text' : 'password'}
                      value={settings.smsSettings.apiKey}
                      onChange={(e) => setSettings({
                        ...settings,
                        smsSettings: { ...settings.smsSettings, apiKey: e.target.value }
                      })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => toggleSecret('sms-api-key')}
                    >
                      {showSecrets['sms-api-key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-api-secret">API Secret</Label>
                  <div className="flex">
                    <Input
                      id="sms-api-secret"
                      type={showSecrets['sms-api-secret'] ? 'text' : 'password'}
                      value={settings.smsSettings.apiSecret}
                      onChange={(e) => setSettings({
                        ...settings,
                        smsSettings: { ...settings.smsSettings, apiSecret: e.target.value }
                      })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => toggleSecret('sms-api-secret')}
                    >
                      {showSecrets['sms-api-secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-number">From Number</Label>
                  <Input
                    id="from-number"
                    value={settings.smsSettings.fromNumber}
                    onChange={(e) => setSettings({
                      ...settings,
                      smsSettings: { ...settings.smsSettings, fromNumber: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-daily-limit">Daily SMS Limit</Label>
                  <Input
                    id="sms-daily-limit"
                    type="number"
                    value={settings.smsSettings.dailyLimit}
                    onChange={(e) => setSettings({
                      ...settings,
                      smsSettings: { ...settings.smsSettings, dailyLimit: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="delivery-receipts"
                  checked={settings.smsSettings.enableDeliveryReceipts}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    smsSettings: { ...settings.smsSettings, enableDeliveryReceipts: checked }
                  })}
                />
                <Label htmlFor="delivery-receipts">Enable delivery receipts</Label>
              </div>

              <Button variant="outline" onClick={() => testConnection('sms')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Test SMS Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="push" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Push Notification Configuration
              </CardTitle>
              <CardDescription>
                Configure web push notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="web-push-enabled"
                  checked={settings.pushSettings.webPushEnabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    pushSettings: { ...settings.pushSettings, webPushEnabled: checked }
                  })}
                />
                <Label htmlFor="web-push-enabled">Enable web push notifications</Label>
              </div>

              {settings.pushSettings.webPushEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fcm-server-key">FCM Server Key</Label>
                    <div className="flex">
                      <Input
                        id="fcm-server-key"
                        type={showSecrets['fcm-server-key'] ? 'text' : 'password'}
                        value={settings.pushSettings.fcmServerKey}
                        onChange={(e) => setSettings({
                          ...settings,
                          pushSettings: { ...settings.pushSettings, fcmServerKey: e.target.value }
                        })}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => toggleSecret('fcm-server-key')}
                      >
                        {showSecrets['fcm-server-key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vapid-public">VAPID Public Key</Label>
                      <Input
                        id="vapid-public"
                        value={settings.pushSettings.vapidPublicKey}
                        onChange={(e) => setSettings({
                          ...settings,
                          pushSettings: { ...settings.pushSettings, vapidPublicKey: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vapid-private">VAPID Private Key</Label>
                      <div className="flex">
                        <Input
                          id="vapid-private"
                          type={showSecrets['vapid-private'] ? 'text' : 'password'}
                          value={settings.pushSettings.vapidPrivateKey}
                          onChange={(e) => setSettings({
                            ...settings,
                            pushSettings: { ...settings.pushSettings, vapidPrivateKey: e.target.value }
                          })}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="ml-2"
                          onClick={() => toggleSecret('vapid-private')}
                        >
                          {showSecrets['vapid-private'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="default-icon">Default Icon URL</Label>
                      <Input
                        id="default-icon"
                        value={settings.pushSettings.defaultIcon}
                        onChange={(e) => setSettings({
                          ...settings,
                          pushSettings: { ...settings.pushSettings, defaultIcon: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="click-action">Click Action URL</Label>
                      <Input
                        id="click-action"
                        value={settings.pushSettings.clickAction}
                        onChange={(e) => setSettings({
                          ...settings,
                          pushSettings: { ...settings.pushSettings, clickAction: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <Button variant="outline" onClick={() => testConnection('push')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Test Push Notifications
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Automation Rules
                  </CardTitle>
                  <CardDescription>
                    Configure automated messaging triggers and actions
                  </CardDescription>
                </div>
                <Button onClick={addAutomationRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settings.automationRules.map((rule) => (
                  <Card key={rule.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{rule.name}</h4>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(checked) => {
                              const updatedRules = settings.automationRules.map(r =>
                                r.id === rule.id ? { ...r, enabled: checked } : r
                              );
                              setSettings({ ...settings, automationRules: updatedRules });
                            }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Trigger: {rule.trigger.replace('_', ' ')}</span>
                          <span>Channel: {rule.action.channel}</span>
                          <span>Triggered: {rule.triggerCount} times</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editAutomationRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAutomationRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Message Defaults
              </CardTitle>
              <CardDescription>
                Configure default settings for all messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-template">Default Template</Label>
                  <Select
                    value={settings.messageDefaults.defaultTemplate}
                    onValueChange={(value) => setSettings({
                      ...settings,
                      messageDefaults: { ...settings.messageDefaults, defaultTemplate: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default-notification">Default Notification</SelectItem>
                      <SelectItem value="welcome-new-user">Welcome New User</SelectItem>
                      <SelectItem value="document-verified">Document Verified</SelectItem>
                      <SelectItem value="help-request-update">Help Request Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-sender">Default Sender</Label>
                  <Input
                    id="default-sender"
                    value={settings.messageDefaults.defaultSender}
                    onChange={(e) => setSettings({
                      ...settings,
                      messageDefaults: { ...settings.messageDefaults, defaultSender: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-unsubscribe"
                    checked={settings.messageDefaults.includeUnsubscribeLink}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      messageDefaults: { ...settings.messageDefaults, includeUnsubscribeLink: checked }
                    })}
                  />
                  <Label htmlFor="include-unsubscribe">Include unsubscribe link in emails</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="track-opens"
                    checked={settings.messageDefaults.trackOpens}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      messageDefaults: { ...settings.messageDefaults, trackOpens: checked }
                    })}
                  />
                  <Label htmlFor="track-opens">Track email opens</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="track-clicks"
                    checked={settings.messageDefaults.trackClicks}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      messageDefaults: { ...settings.messageDefaults, trackClicks: checked }
                    })}
                  />
                  <Label htmlFor="track-clicks">Track link clicks</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-retries"
                    checked={settings.messageDefaults.enableRetries}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      messageDefaults: { ...settings.messageDefaults, enableRetries: checked }
                    })}
                  />
                  <Label htmlFor="enable-retries">Enable automatic retries for failed messages</Label>
                </div>
              </div>

              {settings.messageDefaults.enableRetries && (
                <div className="space-y-2">
                  <Label htmlFor="retry-attempts">Maximum Retry Attempts</Label>
                  <Input
                    id="retry-attempts"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.messageDefaults.retryAttempts}
                    onChange={(e) => setSettings({
                      ...settings,
                      messageDefaults: { ...settings.messageDefaults, retryAttempts: parseInt(e.target.value) }
                    })}
                    className="w-32"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance & Privacy
              </CardTitle>
              <CardDescription>
                Configure compliance and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ensure your communication practices comply with applicable regulations including GDPR, CAN-SPAM, and local privacy laws.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="gdpr-compliant"
                    checked={settings.compliance.gdprCompliant}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      compliance: { ...settings.compliance, gdprCompliant: checked }
                    })}
                  />
                  <Label htmlFor="gdpr-compliant">GDPR Compliant</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="can-spam-compliant"
                    checked={settings.compliance.canSpamCompliant}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      compliance: { ...settings.compliance, canSpamCompliant: checked }
                    })}
                  />
                  <Label htmlFor="can-spam-compliant">CAN-SPAM Compliant</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="require-opt-in"
                    checked={settings.compliance.requireOptIn}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      compliance: { ...settings.compliance, requireOptIn: checked }
                    })}
                  />
                  <Label htmlFor="require-opt-in">Require explicit opt-in for marketing communications</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="allow-anonymous"
                    checked={settings.compliance.allowAnonymousMessaging}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      compliance: { ...settings.compliance, allowAnonymousMessaging: checked }
                    })}
                  />
                  <Label htmlFor="allow-anonymous">Allow anonymous messaging</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto-delete-days">Auto-delete message data after (days)</Label>
                <Input
                  id="auto-delete-days"
                  type="number"
                  min="30"
                  max="2555" // 7 years
                  value={settings.compliance.autoDeleteAfterDays}
                  onChange={(e) => setSettings({
                    ...settings,
                    compliance: { ...settings.compliance, autoDeleteAfterDays: parseInt(e.target.value) }
                  })}
                  className="w-32"
                />
                <p className="text-xs text-gray-500">
                  Minimum 30 days, maximum 7 years. Message data will be automatically deleted after this period.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Automation Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule?.id ? 'Edit Automation Rule' : 'Add Automation Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure when and how automated messages are sent
            </DialogDescription>
          </DialogHeader>
          
          {editingRule && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-trigger">Trigger</Label>
                  <Select
                    value={editingRule.trigger}
                    onValueChange={(value: AutomationRule['trigger']) => 
                      setEditingRule({ ...editingRule, trigger: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user_registered">User Registered</SelectItem>
                      <SelectItem value="document_verified">Document Verified</SelectItem>
                      <SelectItem value="help_request_approved">Help Request Approved</SelectItem>
                      <SelectItem value="volunteer_assigned">Volunteer Assigned</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-description">Description</Label>
                <Textarea
                  id="rule-description"
                  value={editingRule.description}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-channel">Channel</Label>
                  <Select
                    value={editingRule.action.channel}
                    onValueChange={(value: AutomationRule['action']['channel']) => 
                      setEditingRule({ 
                        ...editingRule, 
                        action: { ...editingRule.action, channel: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="push">Push Notification</SelectItem>
                      <SelectItem value="in_app">In-App Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-template">Template</Label>
                  <Input
                    id="rule-template"
                    value={editingRule.action.template}
                    onChange={(e) => setEditingRule({ 
                      ...editingRule, 
                      action: { ...editingRule.action, template: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-delay">Delay (minutes)</Label>
                <Input
                  id="rule-delay"
                  type="number"
                  min="0"
                  value={editingRule.conditions.delay || 0}
                  onChange={(e) => setEditingRule({ 
                    ...editingRule, 
                    conditions: { ...editingRule.conditions, delay: parseInt(e.target.value) }
                  })}
                  className="w-32"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="rule-enabled"
                  checked={editingRule.enabled}
                  onCheckedChange={(checked) => setEditingRule({ ...editingRule, enabled: checked })}
                />
                <Label htmlFor="rule-enabled">Enable this rule</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAutomationRule}>
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
