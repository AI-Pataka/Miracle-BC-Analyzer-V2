import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus, GripVertical, Trash2, X, Check,
  AlertTriangle, Settings2, Route, Star, BookOpen,
  ShoppingCart, School, Package, CreditCard, Headphones,
  Wallet, Sparkles,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'Learn' | 'Buy' | 'Get' | 'Pay' | 'Support';
type Initiator = 'Customer' | 'System';

interface JourneyStep {
  id: string;
  stepId: string;
  stepName: string;
  phase: Phase;
  initiator: Initiator;
  isFoundational: boolean;
  hasFriction: boolean;
  frictionReason: string;
  requiredCapabilities: string[];
  order: number;
}

interface Journey {
  id: string;
  name: string;
  totalBaseVolume: string;
  primaryValueStream: string;
  steps: JourneyStep[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES: Phase[] = ['Learn', 'Buy', 'Get', 'Pay', 'Support'];

const PHASE_STYLES: Record<Phase, { bg: string; text: string; ring: string; dot: string }> = {
  Learn:   { bg: 'bg-violet-50',  text: 'text-violet-700',  ring: 'ring-violet-200',  dot: 'bg-violet-500'  },
  Buy:     { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200',    dot: 'bg-blue-500'    },
  Get:     { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  Pay:     { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500'   },
  Support: { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    dot: 'bg-rose-500'    },
};

const CAPABILITY_OPTIONS = [
  'Knowledge Search', 'Content Personalisation', 'Document Authoring', 'Taxonomy Management',
  'Chat & Messaging', 'Voice & IVR', 'Sentiment Analysis', 'Churn Prediction',
  'Batch Processing', 'Real-time Streaming', 'Predictive Modelling', 'Executive Dashboards',
  'Invoice Processing', 'Regulatory Compliance', 'Cash Flow Forecasting', 'Order Management',
  'Identity Verification', 'Payment Processing', 'Device Provisioning', 'SIM Management',
  'Network Activation', 'Credit Check', 'Contract Generation', 'Notification Engine',
];

const VALUE_STREAMS = [
  'Revenue Growth', 'Cost Reduction', 'Customer Experience', 'Operational Efficiency',
  'Compliance & Risk', 'Digital Transformation',
];

const PHASE_CIRCLE_GRADIENT: Record<Phase, string> = {
  Learn:   'linear-gradient(135deg, #7c3aed, #a78bfa)',
  Buy:     'linear-gradient(135deg, #006190, #007bb5)',
  Get:     'linear-gradient(135deg, #059669, #34d399)',
  Pay:     'linear-gradient(135deg, #d97706, #fbbf24)',
  Support: 'linear-gradient(135deg, #e11d48, #fb7185)',
};

const PHASE_BORDER_LEFT: Record<Phase, string> = {
  Learn:   'border-l-violet-500',
  Buy:     'border-l-blue-500',
  Get:     'border-l-emerald-500',
  Pay:     'border-l-amber-500',
  Support: 'border-l-rose-500',
};

const PHASE_ICON_BG: Record<Phase, string> = {
  Learn:   'bg-violet-100 text-violet-600',
  Buy:     'bg-blue-100 text-blue-600',
  Get:     'bg-emerald-100 text-emerald-600',
  Pay:     'bg-amber-100 text-amber-600',
  Support: 'bg-rose-100 text-rose-600',
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_JOURNEYS: Journey[] = [
  {
    id: 'J001', name: 'Trade In', totalBaseVolume: '125,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '100', stepName: 'Discover Trade-In Offer', phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation', 'Knowledge Search'], order: 0 },
      { id: 's2', stepId: '110', stepName: 'Device Eligibility Check',  phase: 'Buy',  initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Identity Verification'],                         order: 1 },
      { id: 's3', stepId: '120', stepName: 'Device Valuation',          phase: 'Buy',  initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Valuation tool latency causes drop-off; customers abandon if estimate takes >5s.', requiredCapabilities: ['Predictive Modelling'], order: 2 },
      { id: 's4', stepId: '130', stepName: 'Accept Trade-In Terms',     phase: 'Buy',  initiator: 'Customer', isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Contract Generation'],                             order: 3 },
      { id: 's5', stepId: '140', stepName: 'Ship Old Device',           phase: 'Get',  initiator: 'Customer', isFoundational: false, hasFriction: true,  frictionReason: 'Packaging kit not always included; customers call support.', requiredCapabilities: ['Notification Engine', 'Order Management'], order: 4 },
      { id: 's6', stepId: '150', stepName: 'Credit Applied to Account', phase: 'Pay',  initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing'],                              order: 5 },
    ],
  },
  {
    id: 'J002', name: 'Port In', totalBaseVolume: '88,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '200', stepName: 'Check Number Portability',  phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['SIM Management', 'Identity Verification'],  order: 0 },
      { id: 's2', stepId: '210', stepName: 'Plan Selection',            phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation'],                    order: 1 },
      { id: 's3', stepId: '220', stepName: 'Credit Check',              phase: 'Buy',   initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Credit check failures not communicated clearly, causing confusion.', requiredCapabilities: ['Credit Check'], order: 2 },
      { id: 's4', stepId: '230', stepName: 'Number Transfer Initiated', phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['SIM Management', 'Network Activation'],        order: 3 },
      { id: 's5', stepId: '240', stepName: 'Welcome Communication',     phase: 'Support', initiator: 'System', isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine'],                        order: 4 },
    ],
  },
  {
    id: 'J003', name: 'FWA', totalBaseVolume: '42,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '300', stepName: 'Coverage Availability Check', phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Knowledge Search'],                                  order: 0 },
      { id: 's2', stepId: '310', stepName: 'Plan & Device Bundle Selection', phase: 'Buy', initiator: 'Customer', isFoundational: true, hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation'],                            order: 1 },
      { id: 's3', stepId: '320', stepName: 'Installation Scheduling',   phase: 'Get',   initiator: 'Customer', isFoundational: true,  hasFriction: true,  frictionReason: 'Long lead times (2–3 weeks) cause churn before activation.', requiredCapabilities: ['Order Management', 'Notification Engine'], order: 2 },
      { id: 's4', stepId: '330', stepName: 'Device Provisioning',       phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Device Provisioning', 'Network Activation'],           order: 3 },
      { id: 's5', stepId: '340', stepName: 'First Bill Explanation',    phase: 'Pay',   initiator: 'System',   isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine'],                                  order: 4 },
    ],
  },
  {
    id: 'J004', name: 'BYOD', totalBaseVolume: '67,500', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '400', stepName: 'Device Compatibility Check', phase: 'Learn', initiator: 'Customer', isFoundational: true, hasFriction: true, frictionReason: 'Compatibility checker has gaps for newer models.', requiredCapabilities: ['Knowledge Search', 'Identity Verification'], order: 0 },
      { id: 's2', stepId: '410', stepName: 'SIM Order',                 phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['SIM Management', 'Order Management'],                   order: 1 },
      { id: 's3', stepId: '420', stepName: 'SIM Delivered',             phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine'],                                  order: 2 },
      { id: 's4', stepId: '430', stepName: 'Network Activation',        phase: 'Get',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Network Activation', 'SIM Management'],                 order: 3 },
    ],
  },
  {
    id: 'J005', name: 'Upgrade', totalBaseVolume: '210,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '500', stepName: 'Eligibility Notification',  phase: 'Learn', initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine', 'Predictive Modelling'],          order: 0 },
      { id: 's2', stepId: '510', stepName: 'Device & Plan Selection',   phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation'],                              order: 1 },
      { id: 's3', stepId: '520', stepName: 'Trade-In Assessment',       phase: 'Buy',   initiator: 'Customer', isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Predictive Modelling', 'Order Management'],              order: 2 },
      { id: 's4', stepId: '530', stepName: 'Order Confirmation',        phase: 'Buy',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Contract Generation', 'Notification Engine'],            order: 3 },
      { id: 's5', stepId: '540', stepName: 'Device Dispatch',           phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Notification Engine'],               order: 4 },
      { id: 's6', stepId: '550', stepName: 'Device Setup Assistance',   phase: 'Support', initiator: 'System', isFoundational: false, hasFriction: true,  frictionReason: 'Self-setup failure rate is high for non-tech-savvy customers.', requiredCapabilities: ['Chat & Messaging', 'Knowledge Search'], order: 5 },
      { id: 's7', stepId: '560', stepName: 'Payment Plan Initiated',    phase: 'Pay',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing'],                                   order: 6 },
    ],
  },
  {
    id: 'J006', name: 'Purchase – New Line', totalBaseVolume: '185,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '600', stepName: 'Browse Plans & Devices',       phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation', 'Knowledge Search'], order: 0 },
      { id: 's2', stepId: '610', stepName: 'Credit Check',                 phase: 'Buy',   initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Credit bureau timeouts cause ~8% abandonment.', requiredCapabilities: ['Credit Check', 'Identity Verification'], order: 1 },
      { id: 's3', stepId: '620', stepName: 'Cart & Checkout',              phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Payment Processing'], order: 2 },
      { id: 's4', stepId: '630', stepName: 'Device Shipment',              phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Notification Engine'], order: 3 },
      { id: 's5', stepId: '640', stepName: 'SIM & Network Activation',     phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['SIM Management', 'Network Activation'], order: 4 },
      { id: 's6', stepId: '650', stepName: 'First Bill Generation',        phase: 'Pay',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Invoice Processing', 'Notification Engine'], order: 5 },
      { id: 's7', stepId: '660', stepName: 'Welcome & Onboarding',         phase: 'Support', initiator: 'System', isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine', 'Content Personalisation'], order: 6 },
    ],
  },
  {
    id: 'J007', name: 'International Roaming', totalBaseVolume: '55,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '700', stepName: 'Roaming Plan Discovery',    phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation', 'Knowledge Search'], order: 0 },
      { id: 's2', stepId: '710', stepName: 'Roaming Pass Purchase',     phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing', 'Order Management'], order: 1 },
      { id: 's3', stepId: '720', stepName: 'Roaming Activation',        phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Partner network provisioning can take up to 24 hrs.', requiredCapabilities: ['Network Activation'], order: 2 },
      { id: 's4', stepId: '730', stepName: 'Usage Alerts & Billing',    phase: 'Pay',   initiator: 'System',   isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine', 'Invoice Processing'], order: 3 },
    ],
  },
  {
    id: 'J008', name: 'Bill Pay & AutoPay Setup', totalBaseVolume: '320,000', primaryValueStream: 'Operational Efficiency',
    steps: [
      { id: 's1', stepId: '800', stepName: 'View Current Bill',         phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Executive Dashboards', 'Invoice Processing'], order: 0 },
      { id: 's2', stepId: '810', stepName: 'Make One-Time Payment',     phase: 'Pay',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing'], order: 1 },
      { id: 's3', stepId: '820', stepName: 'Enroll in AutoPay',         phase: 'Buy',   initiator: 'Customer', isFoundational: false, hasFriction: true,  frictionReason: 'Bank verification failures cause 12% drop-off.', requiredCapabilities: ['Payment Processing', 'Identity Verification'], order: 2 },
      { id: 's4', stepId: '830', stepName: 'Payment Confirmation',      phase: 'Pay',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine'], order: 3 },
    ],
  },
  {
    id: 'J009', name: 'Suspend & Resume', totalBaseVolume: '28,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '900', stepName: 'Request Service Suspension', phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Chat & Messaging', 'Identity Verification'], order: 0 },
      { id: 's2', stepId: '910', stepName: 'Confirm Suspension Terms',   phase: 'Buy',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Contract Generation'], order: 1 },
      { id: 's3', stepId: '920', stepName: 'Line Suspended',             phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Network Activation', 'SIM Management'], order: 2 },
      { id: 's4', stepId: '930', stepName: 'Resume Request',             phase: 'Support', initiator: 'Customer', isFoundational: true, hasFriction: true, frictionReason: 'Reactivation can take 4–8 hrs during peak.', requiredCapabilities: ['Network Activation', 'Notification Engine'], order: 3 },
    ],
  },
  {
    id: 'J010', name: 'Device Protection Claim', totalBaseVolume: '95,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '1000', stepName: 'File Damage/Loss Claim',    phase: 'Learn',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Knowledge Search', 'Identity Verification'], order: 0 },
      { id: 's2', stepId: '1010', stepName: 'Claim Adjudication',        phase: 'Buy',     initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Third-party insurer SLA causes 48-hr delays.', requiredCapabilities: ['Regulatory Compliance', 'Batch Processing'], order: 1 },
      { id: 's3', stepId: '1020', stepName: 'Deductible Payment',        phase: 'Pay',     initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing'], order: 2 },
      { id: 's4', stepId: '1030', stepName: 'Replacement Device Shipped', phase: 'Get',    initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Notification Engine'], order: 3 },
      { id: 's5', stepId: '1040', stepName: 'Data Transfer Assistance',  phase: 'Support', initiator: 'System',   isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Chat & Messaging', 'Knowledge Search'], order: 4 },
    ],
  },
  {
    id: 'J011', name: 'Account Closure', totalBaseVolume: '35,000', primaryValueStream: 'Compliance & Risk',
    steps: [
      { id: 's1', stepId: '1100', stepName: 'Cancellation Request',      phase: 'Learn',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Chat & Messaging', 'Identity Verification'], order: 0 },
      { id: 's2', stepId: '1110', stepName: 'Retention Offer',           phase: 'Buy',     initiator: 'System',   isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Churn Prediction', 'Content Personalisation'], order: 1 },
      { id: 's3', stepId: '1120', stepName: 'Final Bill & ETF Calculation', phase: 'Pay',  initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'ETF disputes account for 40% of cancellation complaints.', requiredCapabilities: ['Invoice Processing', 'Contract Generation'], order: 2 },
      { id: 's4', stepId: '1130', stepName: 'Equipment Return',          phase: 'Get',     initiator: 'Customer', isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Notification Engine'], order: 3 },
      { id: 's5', stepId: '1140', stepName: 'Account Deactivation',      phase: 'Support', initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Network Activation', 'Regulatory Compliance'], order: 4 },
    ],
  },
  {
    id: 'J012', name: 'Add a Line', totalBaseVolume: '140,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '1200', stepName: 'Explore Family/Multi-Line Plans', phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation', 'Knowledge Search'], order: 0 },
      { id: 's2', stepId: '1210', stepName: 'Select Device & Plan',     phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation'], order: 1 },
      { id: 's3', stepId: '1220', stepName: 'Credit Re-assessment',     phase: 'Buy',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Credit Check'], order: 2 },
      { id: 's4', stepId: '1230', stepName: 'Line Provisioning',        phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['SIM Management', 'Network Activation'], order: 3 },
      { id: 's5', stepId: '1240', stepName: 'Consolidated Billing Update', phase: 'Pay', initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Invoice Processing'], order: 4 },
    ],
  },
  {
    id: 'J013', name: 'Plan Change / Migration', totalBaseVolume: '175,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '1300', stepName: 'Compare Available Plans',   phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation', 'Knowledge Search'], order: 0 },
      { id: 's2', stepId: '1310', stepName: 'Select New Plan',           phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management'], order: 1 },
      { id: 's3', stepId: '1320', stepName: 'Plan Switchover',           phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Mid-cycle changes cause pro-rated billing confusion.', requiredCapabilities: ['Invoice Processing', 'Network Activation'], order: 2 },
      { id: 's4', stepId: '1330', stepName: 'Confirmation & New Terms',  phase: 'Pay',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Contract Generation', 'Notification Engine'], order: 3 },
    ],
  },
  {
    id: 'J014', name: 'Prepaid Refill / Top-Up', totalBaseVolume: '260,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '1400', stepName: 'Check Balance & Options',   phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Executive Dashboards'], order: 0 },
      { id: 's2', stepId: '1410', stepName: 'Select Refill Amount',      phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation'], order: 1 },
      { id: 's3', stepId: '1420', stepName: 'Payment Processing',        phase: 'Pay',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing'], order: 2 },
      { id: 's4', stepId: '1430', stepName: 'Balance Updated',           phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Real-time Streaming', 'Notification Engine'], order: 3 },
    ],
  },
  {
    id: 'J015', name: 'Technical Support – Network Issue', totalBaseVolume: '110,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '1500', stepName: 'Report Connectivity Issue', phase: 'Learn',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Chat & Messaging', 'Voice & IVR'], order: 0 },
      { id: 's2', stepId: '1510', stepName: 'Automated Diagnostics',     phase: 'Get',     initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Real-time Streaming', 'Predictive Modelling'], order: 1 },
      { id: 's3', stepId: '1520', stepName: 'Remote Fix Applied',        phase: 'Get',     initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Automated fix success rate only 45%; rest escalated to L2.', requiredCapabilities: ['Network Activation', 'Device Provisioning'], order: 2 },
      { id: 's4', stepId: '1530', stepName: 'Resolution Confirmation',   phase: 'Support', initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine', 'Sentiment Analysis'], order: 3 },
    ],
  },
  {
    id: 'J016', name: 'eSIM Activation', totalBaseVolume: '72,000', primaryValueStream: 'Digital Transformation',
    steps: [
      { id: 's1', stepId: '1600', stepName: 'eSIM Compatibility Check',  phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Knowledge Search', 'Identity Verification'], order: 0 },
      { id: 's2', stepId: '1610', stepName: 'eSIM Profile Purchase',     phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing', 'Order Management'], order: 1 },
      { id: 's3', stepId: '1620', stepName: 'QR Code / Profile Download', phase: 'Get',  initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'QR scan failures on older devices cause support calls.', requiredCapabilities: ['SIM Management', 'Device Provisioning'], order: 2 },
      { id: 's4', stepId: '1630', stepName: 'Network Registration',      phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Network Activation'], order: 3 },
    ],
  },
  {
    id: 'J017', name: 'Billing Dispute', totalBaseVolume: '48,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '1700', stepName: 'Identify Billing Discrepancy', phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Invoice Processing', 'Executive Dashboards'], order: 0 },
      { id: 's2', stepId: '1710', stepName: 'Open Dispute Ticket',       phase: 'Buy',     initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Chat & Messaging', 'Document Authoring'], order: 1 },
      { id: 's3', stepId: '1720', stepName: 'Investigation & Audit',     phase: 'Get',     initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Manual review queue averages 5 business days.', requiredCapabilities: ['Batch Processing', 'Regulatory Compliance'], order: 2 },
      { id: 's4', stepId: '1730', stepName: 'Credit / Adjustment Applied', phase: 'Pay',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing', 'Notification Engine'], order: 3 },
    ],
  },
  {
    id: 'J018', name: '5G Home Internet', totalBaseVolume: '38,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '1800', stepName: '5G Coverage Verification',  phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Knowledge Search'], order: 0 },
      { id: 's2', stepId: '1810', stepName: 'Plan Selection & Order',    phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation', 'Order Management'], order: 1 },
      { id: 's3', stepId: '1820', stepName: 'Gateway Device Delivery',   phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Notification Engine'], order: 2 },
      { id: 's4', stepId: '1830', stepName: 'Self-Install & Activation', phase: 'Get',   initiator: 'Customer', isFoundational: true,  hasFriction: true,  frictionReason: 'Optimal gateway placement is non-obvious; 30% need support call.', requiredCapabilities: ['Device Provisioning', 'Network Activation'], order: 3 },
      { id: 's5', stepId: '1840', stepName: 'Speed Test & Confirmation', phase: 'Support', initiator: 'Customer', isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Real-time Streaming'], order: 4 },
    ],
  },
  {
    id: 'J019', name: 'Business Account Setup', totalBaseVolume: '22,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '1900', stepName: 'Enterprise Needs Assessment', phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Knowledge Search', 'Content Personalisation'], order: 0 },
      { id: 's2', stepId: '1910', stepName: 'Custom Quote & Proposal',   phase: 'Buy',   initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Custom pricing requires manual approval from finance.', requiredCapabilities: ['Document Authoring', 'Contract Generation'], order: 1 },
      { id: 's3', stepId: '1920', stepName: 'Contract Execution',        phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Contract Generation', 'Regulatory Compliance'], order: 2 },
      { id: 's4', stepId: '1930', stepName: 'Bulk Line Provisioning',    phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['SIM Management', 'Network Activation', 'Batch Processing'], order: 3 },
      { id: 's5', stepId: '1940', stepName: 'Admin Portal Onboarding',   phase: 'Support', initiator: 'System', isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine', 'Knowledge Search'], order: 4 },
    ],
  },
  {
    id: 'J020', name: 'Device Repair (Walk-In)', totalBaseVolume: '80,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '2000', stepName: 'Book Repair Appointment',   phase: 'Learn',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Knowledge Search', 'Chat & Messaging'], order: 0 },
      { id: 's2', stepId: '2010', stepName: 'Device Diagnosis at Store', phase: 'Get',     initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Identity Verification'], order: 1 },
      { id: 's3', stepId: '2020', stepName: 'Repair Cost Approval',      phase: 'Pay',     initiator: 'Customer', isFoundational: true,  hasFriction: true,  frictionReason: 'Unexpected cost (not covered by warranty) causes 25% walk-aways.', requiredCapabilities: ['Payment Processing'], order: 2 },
      { id: 's4', stepId: '2030', stepName: 'Repair Completion',         phase: 'Get',     initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Notification Engine'], order: 3 },
    ],
  },
  {
    id: 'J021', name: 'Number Change', totalBaseVolume: '18,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '2100', stepName: 'Request Number Change',     phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Identity Verification', 'Chat & Messaging'], order: 0 },
      { id: 's2', stepId: '2110', stepName: 'Select New Number',         phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['SIM Management'], order: 1 },
      { id: 's3', stepId: '2120', stepName: 'Number Provisioning',       phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Network Activation', 'SIM Management'], order: 2 },
      { id: 's4', stepId: '2130', stepName: 'Contact Update Reminder',   phase: 'Support', initiator: 'System', isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine'], order: 3 },
    ],
  },
  {
    id: 'J022', name: 'SIM Replacement', totalBaseVolume: '62,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '2200', stepName: 'Report Lost/Damaged SIM',   phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Chat & Messaging', 'Identity Verification'], order: 0 },
      { id: 's2', stepId: '2210', stepName: 'Order Replacement SIM',     phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'SIM Management'], order: 1 },
      { id: 's3', stepId: '2220', stepName: 'SIM Delivery / Pickup',     phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Notification Engine'], order: 2 },
      { id: 's4', stepId: '2230', stepName: 'SIM Swap & Reactivation',   phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Swap window causes 1–4 hr service outage.', requiredCapabilities: ['SIM Management', 'Network Activation'], order: 3 },
    ],
  },
  {
    id: 'J023', name: 'Loyalty Rewards Redemption', totalBaseVolume: '145,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '2300', stepName: 'Check Rewards Balance',     phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Executive Dashboards', 'Content Personalisation'], order: 0 },
      { id: 's2', stepId: '2310', stepName: 'Browse Reward Catalog',     phase: 'Learn', initiator: 'Customer', isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation'], order: 1 },
      { id: 's3', stepId: '2320', stepName: 'Redeem Reward',             phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Payment Processing'], order: 2 },
      { id: 's4', stepId: '2330', stepName: 'Reward Fulfilment',         phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Notification Engine'], order: 3 },
    ],
  },
  {
    id: 'J024', name: 'Fraud Alert & Resolution', totalBaseVolume: '15,000', primaryValueStream: 'Compliance & Risk',
    steps: [
      { id: 's1', stepId: '2400', stepName: 'Fraud Detection Triggered', phase: 'Learn',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Real-time Streaming', 'Predictive Modelling'], order: 0 },
      { id: 's2', stepId: '2410', stepName: 'Customer Notification',     phase: 'Get',     initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine', 'Chat & Messaging'], order: 1 },
      { id: 's3', stepId: '2420', stepName: 'Identity Re-verification',  phase: 'Get',     initiator: 'Customer', isFoundational: true,  hasFriction: true,  frictionReason: 'Legitimate customers frustrated by verification friction.', requiredCapabilities: ['Identity Verification'], order: 2 },
      { id: 's4', stepId: '2430', stepName: 'Account Secured / Refund',  phase: 'Pay',     initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing', 'Regulatory Compliance'], order: 3 },
      { id: 's5', stepId: '2440', stepName: 'Incident Report Filed',     phase: 'Support', initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Document Authoring', 'Regulatory Compliance'], order: 4 },
    ],
  },
  {
    id: 'J025', name: 'Accessory Purchase', totalBaseVolume: '200,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '2500', stepName: 'Browse Accessories',        phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation', 'Knowledge Search'], order: 0 },
      { id: 's2', stepId: '2510', stepName: 'Add to Cart & Checkout',    phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Payment Processing'], order: 1 },
      { id: 's3', stepId: '2520', stepName: 'Shipping & Delivery',       phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Notification Engine'], order: 2 },
    ],
  },
  {
    id: 'J026', name: 'Data Add-On Purchase', totalBaseVolume: '155,000', primaryValueStream: 'Revenue Growth',
    steps: [
      { id: 's1', stepId: '2600', stepName: 'Data Usage Alert',          phase: 'Learn', initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine', 'Real-time Streaming'], order: 0 },
      { id: 's2', stepId: '2610', stepName: 'Select Data Add-On',        phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation'], order: 1 },
      { id: 's3', stepId: '2620', stepName: 'Instant Activation',        phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Network Activation', 'Real-time Streaming'], order: 2 },
      { id: 's4', stepId: '2630', stepName: 'Charge Applied to Bill',    phase: 'Pay',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Invoice Processing'], order: 3 },
    ],
  },
  {
    id: 'J027', name: 'Warranty Claim', totalBaseVolume: '42,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '2700', stepName: 'Check Warranty Status',     phase: 'Learn',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Knowledge Search', 'Identity Verification'], order: 0 },
      { id: 's2', stepId: '2710', stepName: 'Submit Claim',              phase: 'Buy',     initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Document Authoring', 'Chat & Messaging'], order: 1 },
      { id: 's3', stepId: '2720', stepName: 'Device Inspection & Approval', phase: 'Get',  initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Physical inspection required at service center; 3-5 day turnaround.', requiredCapabilities: ['Order Management', 'Regulatory Compliance'], order: 2 },
      { id: 's4', stepId: '2730', stepName: 'Replacement / Repair',      phase: 'Get',     initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Order Management', 'Notification Engine'], order: 3 },
    ],
  },
  {
    id: 'J028', name: 'Family Plan Management', totalBaseVolume: '98,000', primaryValueStream: 'Customer Experience',
    steps: [
      { id: 's1', stepId: '2800', stepName: 'Review Family Plan Options', phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation', 'Knowledge Search'], order: 0 },
      { id: 's2', stepId: '2810', stepName: 'Add / Remove Members',      phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: true,  frictionReason: 'Removing a member requires owner identity verification + member consent.', requiredCapabilities: ['Identity Verification', 'Order Management'], order: 1 },
      { id: 's3', stepId: '2820', stepName: 'Usage Controls Setup',      phase: 'Get',   initiator: 'Customer', isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Device Provisioning', 'Network Activation'], order: 2 },
      { id: 's4', stepId: '2830', stepName: 'Shared Data Pool Adjustment', phase: 'Pay', initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Invoice Processing', 'Notification Engine'], order: 3 },
    ],
  },
  {
    id: 'J029', name: 'Network Outage Communication', totalBaseVolume: '30,000', primaryValueStream: 'Operational Efficiency',
    steps: [
      { id: 's1', stepId: '2900', stepName: 'Outage Detection',          phase: 'Learn',   initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Real-time Streaming', 'Predictive Modelling'], order: 0 },
      { id: 's2', stepId: '2910', stepName: 'Customer Notification',     phase: 'Get',     initiator: 'System',   isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Notification Engine', 'Batch Processing'], order: 1 },
      { id: 's3', stepId: '2920', stepName: 'Status Updates',            phase: 'Support', initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Lack of real-time ETA frustrates customers.', requiredCapabilities: ['Real-time Streaming', 'Chat & Messaging'], order: 2 },
      { id: 's4', stepId: '2930', stepName: 'Service Restoration Credit', phase: 'Pay',   initiator: 'System',   isFoundational: false, hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing', 'Invoice Processing'], order: 3 },
    ],
  },
  {
    id: 'J030', name: 'IoT / Smartwatch Pairing', totalBaseVolume: '45,000', primaryValueStream: 'Digital Transformation',
    steps: [
      { id: 's1', stepId: '3000', stepName: 'Wearable Plan Discovery',   phase: 'Learn', initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Content Personalisation', 'Knowledge Search'], order: 0 },
      { id: 's2', stepId: '3010', stepName: 'Wearable Plan Purchase',    phase: 'Buy',   initiator: 'Customer', isFoundational: true,  hasFriction: false, frictionReason: '', requiredCapabilities: ['Payment Processing', 'Order Management'], order: 1 },
      { id: 's3', stepId: '3020', stepName: 'eSIM / Number Share Setup', phase: 'Get',   initiator: 'System',   isFoundational: true,  hasFriction: true,  frictionReason: 'Number share provisioning fails on ~15% of older watches.', requiredCapabilities: ['SIM Management', 'Device Provisioning', 'Network Activation'], order: 2 },
      { id: 's4', stepId: '3030', stepName: 'Connectivity Verification', phase: 'Support', initiator: 'Customer', isFoundational: true, hasFriction: false, frictionReason: '', requiredCapabilities: ['Real-time Streaming', 'Chat & Messaging'], order: 3 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateStepId(): string {
  return `s${Date.now().toString(36)}`;
}

function generateJourneyId(existing: Journey[]): string {
  const nums = existing.map(j => parseInt(j.id.replace('J', ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `J${String(max + 1).padStart(3, '0')}`;
}

function getPhaseIcon(phase: Phase): React.ReactNode {
  switch (phase) {
    case 'Learn':   return <School className="w-6 h-6" />;
    case 'Buy':     return <ShoppingCart className="w-6 h-6" />;
    case 'Get':     return <Package className="w-6 h-6" />;
    case 'Pay':     return <CreditCard className="w-6 h-6" />;
    case 'Support': return <Headphones className="w-6 h-6" />;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PhaseBadge: React.FC<{ phase: Phase }> = ({ phase }) => {
  const s = PHASE_STYLES[phase];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider', s.bg, s.text)}>
      {phase}
    </span>
  );
};

const MultiSelectDropdown: React.FC<{
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}> = ({ options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };

  return (
    <div ref={ref} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-3 py-1 bg-[#dbe2f9] text-[#3f4759] rounded-full text-[10px] font-bold">
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-red-500 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); if (open) setSearch(''); }}
        className="px-3 py-1 border-2 border-dashed border-slate-300 rounded-full text-[10px] text-slate-400 hover:bg-slate-100 transition-colors"
      >
        + Add Capability
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search capabilities…"
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006190]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50 text-left transition-colors"
              >
                <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0', selected.includes(opt) ? 'bg-[#006190] border-[#006190]' : 'border-slate-300')}>
                  {selected.includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-slate-700">{opt}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Step Configuration Panel ─────────────────────────────────────────────────

const StepConfigPanel: React.FC<{
  step: JourneyStep;
  onUpdate: (updated: JourneyStep) => void;
  onClose: () => void;
  onDelete: () => void;
}> = ({ step, onUpdate, onClose, onDelete }) => {
  const [local, setLocal] = useState<JourneyStep>(step);
  useEffect(() => { setLocal(step); }, [step.id]);

  const set = <K extends keyof JourneyStep>(key: K, value: JourneyStep[K]) =>
    setLocal(prev => ({ ...prev, [key]: value }));

  const handleSave = () => { onUpdate(local); onClose(); };
  const stepDisplayId = `STE-${local.stepId}-${local.phase.slice(0, 3).toUpperCase()}`;

  return (
    <div className="flex flex-col">
      {/* Config Header */}
      <div className="p-6 bg-white flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0', PHASE_ICON_BG[local.phase])}>
            {getPhaseIcon(local.phase)}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Step Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configuring {local.stepName} (ID: {stepDisplayId})</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete step"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#006190] to-[#007bb5] rounded-lg shadow-sm hover:shadow-blue-200 transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Config Fields — 2-column grid */}
      <div className="p-8 grid grid-cols-2 gap-x-12 gap-y-8">
        {/* Col 1 */}
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Step ID</label>
            <input
              readOnly
              type="text"
              value={stepDisplayId}
              className="w-full bg-slate-100/70 border-none rounded-lg p-3 text-sm font-mono text-slate-600 focus:outline-none cursor-default"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Step Name</label>
            <input
              type="text"
              value={local.stepName}
              onChange={e => set('stepName', e.target.value)}
              className="w-full bg-white border-none border-b-2 border-[#006190] rounded-t-lg p-3 text-sm focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Phase</label>
            <select
              value={local.phase}
              onChange={e => set('phase', e.target.value as Phase)}
              className="w-full bg-white border-none border-b-2 border-slate-200 rounded-t-lg p-3 text-sm focus:outline-none focus:border-[#006190] transition-colors cursor-pointer"
            >
              {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Initiator</label>
            <select
              value={local.initiator}
              onChange={e => set('initiator', e.target.value as Initiator)}
              className="w-full bg-white border-none border-b-2 border-slate-200 rounded-t-lg p-3 text-sm focus:outline-none focus:border-[#006190] transition-colors cursor-pointer"
            >
              <option value="Customer">Customer-Led</option>
              <option value="System">System-Automated</option>
            </select>
          </div>
        </div>

        {/* Col 2 */}
        <div className="space-y-6">
          {/* Foundational Toggle */}
          <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-slate-100">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Foundational Step</div>
              <div className="text-xs text-slate-400 mt-0.5">Critical for journey completion</div>
            </div>
            <button
              type="button"
              onClick={() => set('isFoundational', !local.isFoundational)}
              className={cn(
                'w-10 h-5 rounded-full relative flex items-center px-1 transition-colors flex-shrink-0',
                local.isFoundational ? 'bg-[#006190] justify-end' : 'bg-slate-200 justify-start',
              )}
            >
              <span className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
            </button>
          </div>

          {/* Friction Flag */}
          <div className={cn(
            'p-4 rounded-lg border-l-4 transition-colors',
            local.hasFriction ? 'bg-red-50/60 border-red-500' : 'bg-slate-50 border-slate-300',
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className={cn('text-[10px] font-bold uppercase tracking-wider', local.hasFriction ? 'text-red-600' : 'text-slate-500')}>
                Friction Flag
              </div>
              <button
                type="button"
                onClick={() => set('hasFriction', !local.hasFriction)}
                className={cn(
                  'w-10 h-5 rounded-full relative flex items-center px-1 transition-colors flex-shrink-0',
                  local.hasFriction ? 'bg-red-500 justify-end' : 'bg-slate-200 justify-start',
                )}
              >
                <span className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
              </button>
            </div>
            {local.hasFriction && (
              <div className="space-y-1.5 mt-3">
                <label className="block text-[9px] font-semibold uppercase tracking-wider text-red-500/80">Friction Reason</label>
                <textarea
                  value={local.frictionReason}
                  onChange={e => set('frictionReason', e.target.value)}
                  rows={2}
                  placeholder="Describe the friction, customer impact, and root cause…"
                  className="w-full bg-white border-none rounded-lg p-2 text-xs focus:outline-none resize-none"
                />
              </div>
            )}
          </div>

          {/* Required Capabilities */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Required Capabilities</label>
            <MultiSelectDropdown
              options={CAPABILITY_OPTIONS}
              selected={local.requiredCapabilities}
              onChange={v => set('requiredCapabilities', v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Step Block (timeline item) ───────────────────────────────────────────────

const StepBlock: React.FC<{
  step: JourneyStep;
  index: number;
  isSelected: boolean;
  isLast: boolean;
  onSelect: () => void;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}> = ({ step, index, isSelected, onSelect, isDragOver, onDragStart, onDragOver, onDragLeave, onDrop }) => {
  const ps = PHASE_STYLES[step.phase];

  return (
    <div
      className={cn('relative group cursor-pointer', isDragOver && 'opacity-50')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Numbered circle */}
      <div
        className="absolute -left-4 top-3 w-8 h-8 rounded-full ring-2 ring-[#f9f9ff] flex items-center justify-center text-white text-[10px] font-bold z-10 shadow-sm"
        style={{ background: PHASE_CIRCLE_GRADIENT[step.phase] }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Card */}
      <div
        draggable
        onDragStart={onDragStart}
        onClick={onSelect}
        className={cn(
          'bg-white p-4 rounded-lg border-l-4 shadow-sm transition-all',
          PHASE_BORDER_LEFT[step.phase],
          isSelected ? 'ring-2 ring-[#006190]/25 shadow-md' : 'group-hover:-translate-y-0.5 group-hover:shadow-md',
          step.hasFriction && !isSelected && 'ring-2 ring-red-100',
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <PhaseBadge phase={step.phase} />
          <div className="flex items-center gap-2">
            {step.hasFriction && (
              <div className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-[9px] font-bold">Friction Point</span>
              </div>
            )}
            <GripVertical className="w-4 h-4 text-slate-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <h4 className="font-bold text-sm text-slate-800">{step.stepName}</h4>

        {step.hasFriction && step.frictionReason && (
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{step.frictionReason}</p>
        )}

        {step.requiredCapabilities.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {step.requiredCapabilities.slice(0, 4).map((_, i) => (
              <span key={i} className={cn('w-1.5 h-1.5 rounded-full', ps.dot)} />
            ))}
            {step.requiredCapabilities.length > 4 && (
              <span className="text-[8px] text-slate-400 ml-1">+{step.requiredCapabilities.length - 4}</span>
            )}
          </div>
        )}

        {step.isFoundational && (
          <div className="mt-1.5">
            <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 font-semibold">
              <Star className="w-2.5 h-2.5" />
              Foundational
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const JourneyDashboard: React.FC = () => {
  const [journeys, setJourneys] = useState<Journey[]>(SEED_JOURNEYS);
  const [activeJourneyId, setActiveJourneyId] = useState<string>(SEED_JOURNEYS[0].id);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const activeJourney = journeys.find(j => j.id === activeJourneyId)!;
  const selectedStep = activeJourney?.steps.find(s => s.id === selectedStepId) ?? null;

  // ── Journey CRUD ──────────────────────────────────────────────────────────

  const updateJourney = useCallback((patch: Partial<Journey>) => {
    setJourneys(prev => prev.map(j => j.id === activeJourneyId ? { ...j, ...patch } : j));
  }, [activeJourneyId]);

  const addJourney = () => {
    const id = generateJourneyId(journeys);
    const newJourney: Journey = {
      id,
      name: 'New Journey',
      totalBaseVolume: '',
      primaryValueStream: 'Customer Experience',
      steps: [],
    };
    setJourneys(prev => [...prev, newJourney]);
    setActiveJourneyId(id);
    setSelectedStepId(null);
  };

  const deleteJourney = (journeyId: string) => {
    if (journeys.length === 1) return; // keep at least one journey
    const remaining = journeys.filter(j => j.id !== journeyId);
    setJourneys(remaining);
    if (activeJourneyId === journeyId) {
      setActiveJourneyId(remaining[0].id);
      setSelectedStepId(null);
    }
  };

  // ── Step CRUD ─────────────────────────────────────────────────────────────

  const addStep = () => {
    const newStep: JourneyStep = {
      id: generateStepId(),
      stepId: String((activeJourney.steps.length + 1) * 10 + (parseInt(activeJourney.id.replace('J', ''), 10) * 100)),
      stepName: 'New Step',
      phase: 'Learn',
      initiator: 'Customer',
      isFoundational: false,
      hasFriction: false,
      frictionReason: '',
      requiredCapabilities: [],
      order: activeJourney.steps.length,
    };
    updateJourney({ steps: [...activeJourney.steps, newStep] });
    setSelectedStepId(newStep.id);
  };

  const updateStep = useCallback((updated: JourneyStep) => {
    updateJourney({ steps: activeJourney.steps.map(s => s.id === updated.id ? updated : s) });
  }, [activeJourney, updateJourney]);

  const deleteStep = (stepId: string) => {
    updateJourney({ steps: activeJourney.steps.filter(s => s.id !== stepId) });
    if (selectedStepId === stepId) setSelectedStepId(null);
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const steps = [...activeJourney.steps];
    const [moved] = steps.splice(dragIndex, 1);
    steps.splice(idx, 0, moved);
    updateJourney({ steps: steps.map((s, i) => ({ ...s, order: i })) });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ── Phase summary ─────────────────────────────────────────────────────────
  const phaseCounts = PHASES.reduce((acc, p) => {
    acc[p] = activeJourney.steps.filter(s => s.phase === p).length;
    return acc;
  }, {} as Record<Phase, number>);

  const frictionCount = activeJourney.steps.filter(s => s.hasFriction).length;

  const topFrictionPhase = PHASES.reduce<Phase | null>((top, p) => {
    const count = activeJourney.steps.filter(s => s.phase === p && s.hasFriction).length;
    if (count === 0) return top;
    if (!top) return p;
    return count > activeJourney.steps.filter(s => s.phase === top && s.hasFriction).length ? p : top;
  }, null);

  return (
    <Layout noPadding>
      <div className="flex h-screen overflow-hidden bg-[#f9f9ff]">

        {/* ── Journey Sidebar ──────────────────────────────────────────────── */}
        <aside className="w-56 bg-white border-r border-slate-100 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Route className="w-4 h-4 text-[#4648d4]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Journeys</span>
            </div>
          </div>
          <nav className="flex-1 flex flex-col p-2 gap-0.5 overflow-y-auto">
            {journeys.map(j => (
              <div
                key={j.id}
                className={cn(
                  'group relative rounded-lg transition-colors',
                  j.id === activeJourneyId
                    ? 'bg-[#e9edff] border border-[#4648d4]/20'
                    : 'border border-transparent hover:bg-slate-50',
                )}
              >
                <button
                  onClick={() => { setActiveJourneyId(j.id); setSelectedStepId(null); }}
                  className="w-full text-left px-3 py-2.5 pr-8 text-sm font-medium"
                >
                  <div className={cn('flex items-center justify-between gap-2', j.id === activeJourneyId ? 'text-[#4648d4]' : 'text-slate-600')}>
                    <span className="truncate text-xs font-semibold">{j.name}</span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{j.steps.length}</span>
                  </div>
                  <div className="mt-0.5 text-[9px] text-slate-400 truncate">{j.primaryValueStream}</div>
                </button>
                {journeys.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteJourney(j.id); }}
                    className="absolute right-1.5 top-2 p-1 rounded opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                    title="Delete journey"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            {journeys.length} journeys defined
          </div>
        </aside>

        {/* ── Main Canvas ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-8">

            {/* Page Header */}
            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4648d4] mb-1">Journeys</div>
                <input
                  value={activeJourney.name}
                  onChange={e => updateJourney({ name: e.target.value })}
                  className="text-4xl font-extrabold text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-[#4648d4] focus:outline-none w-full tracking-tight pb-0.5 transition-colors"
                />
              </div>
              <button
                onClick={addJourney}
                className="ml-6 flex-shrink-0 bg-gradient-to-br from-[#006190] to-[#007bb5] text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-blue-200/40 transition-all flex items-center gap-2 font-semibold text-sm"
              >
                <Plus className="w-4 h-4" />
                Add New Journey
              </button>
            </div>

            {/* Bento Grid: Metadata & Intelligence Pulse */}
            <div className="grid grid-cols-12 gap-6">
              {/* Journey Metadata Card */}
              <div className="col-span-8 bg-white p-6 rounded-lg relative overflow-hidden shadow-sm border border-slate-100/80">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4648d4] rounded-l-lg" />
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Journey Name</div>
                    <div className="text-base font-bold text-slate-800 truncate">{activeJourney.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Total Base Volume</div>
                    <input
                      value={activeJourney.totalBaseVolume}
                      onChange={e => updateJourney({ totalBaseVolume: e.target.value })}
                      placeholder="e.g. 125,000"
                      className="text-base font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:border-b-2 focus:border-[#006190] w-full pb-0.5 transition-colors placeholder-slate-300"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Primary Value Stream</div>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#4648d4] flex-shrink-0" />
                      <select
                        value={activeJourney.primaryValueStream}
                        onChange={e => updateJourney({ primaryValueStream: e.target.value })}
                        className="text-sm font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer flex-1 min-w-0"
                      >
                        {VALUE_STREAMS.map(vs => <option key={vs}>{vs}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                {/* Phase summary strip */}
                <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
                  {PHASES.map(p => (
                    <div key={p} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ring-1', PHASE_STYLES[p].bg, PHASE_STYLES[p].text, PHASE_STYLES[p].ring)}>
                      <span className={cn('w-2 h-2 rounded-full', PHASE_STYLES[p].dot)} />
                      {p} <span className="font-bold">{phaseCounts[p]}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{activeJourney.steps.length} steps total</span>
                  </div>
                </div>
              </div>

              {/* Intelligence Pulse */}
              <div className="col-span-4 bg-[#293041] p-6 rounded-lg text-white flex flex-col justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Intelligence Pulse</div>
                <div className="flex items-end gap-3 mt-3">
                  <div className="text-3xl font-extrabold text-[#8ecdff]">
                    {activeJourney.steps.length > 0
                      ? `${Math.round((frictionCount / activeJourney.steps.length) * 100)}%`
                      : '—'}
                  </div>
                  <div className="text-xs text-slate-300 pb-1 leading-snug">
                    {frictionCount > 0
                      ? `${frictionCount} friction point${frictionCount > 1 ? 's' : ''} detected${topFrictionPhase ? ` in ${topFrictionPhase} phase` : ''}.`
                      : 'No friction points detected in this journey.'}
                  </div>
                </div>
                <div className="mt-4">
                  <span className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-full',
                    frictionCount > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300',
                  )}>
                    {frictionCount > 0 ? `${frictionCount} friction point${frictionCount > 1 ? 's' : ''}` : 'All clear'}
                  </span>
                </div>
              </div>
            </div>

            {/* Phase Navigation & Workflow Layout */}
            <div className="grid grid-cols-12 gap-8 items-start">

              {/* Left: Step Sequence (Vertical Timeline) */}
              <div className="col-span-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-slate-800">Journey Step Sequence</h3>
                    <p className="text-xs text-slate-500 mt-0.5">— drag to reorder</p>
                  </div>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006190] hover:bg-[#004b71] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Step
                  </button>
                </div>

                {activeJourney.steps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center bg-white rounded-lg border border-dashed border-slate-200">
                    <Route className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-slate-500 font-medium text-sm mb-1">No steps yet</p>
                    <p className="text-xs text-slate-400 mb-3">Add the first step to build this journey</p>
                    <button
                      onClick={addStep}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006190] text-white text-xs font-semibold rounded-lg"
                    >
                      <Plus className="w-3 h-3" />
                      Add First Step
                    </button>
                  </div>
                ) : (
                  <div className="relative pl-8 space-y-3">
                    {/* Vertical connecting line */}
                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200/60" />
                    {activeJourney.steps.map((step, idx) => (
                      <StepBlock
                        key={step.id}
                        step={step}
                        index={idx}
                        isSelected={selectedStepId === step.id}
                        isLast={idx === activeJourney.steps.length - 1}
                        onSelect={() => setSelectedStepId(selectedStepId === step.id ? null : step.id)}
                        isDragOver={dragOverIndex === idx && dragIndex !== idx}
                        onDragStart={e => handleDragStart(e, idx)}
                        onDragOver={e => handleDragOver(e, idx)}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={() => handleDrop(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Step Configuration Panel */}
              <div className="col-span-8">
                {selectedStep ? (
                  <div className="bg-[#f1f3ff] rounded-lg overflow-hidden shadow-sm">
                    <StepConfigPanel
                      step={selectedStep}
                      onUpdate={updateStep}
                      onClose={() => setSelectedStepId(null)}
                      onDelete={() => deleteStep(selectedStep.id)}
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center h-[400px] text-center">
                    <Settings2 className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium mb-1">No step selected</p>
                    <p className="text-sm text-slate-400">Select a step from the sequence to configure it</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Floating Action Button */}
        <button className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-[#4648d4] text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-150 z-50">
          <Sparkles className="w-6 h-6" />
        </button>

      </div>
    </Layout>
  );
};
