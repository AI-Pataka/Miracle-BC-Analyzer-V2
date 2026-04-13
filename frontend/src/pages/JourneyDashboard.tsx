import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus, GripVertical, ChevronRight, Trash2, X, Check,
  AlertTriangle, Settings2, Route, Users, Zap, ChevronsRight,
  Star, Flag, BookOpen,
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

// ─── Sub-components ───────────────────────────────────────────────────────────

const PhaseBadge: React.FC<{ phase: Phase }> = ({ phase }) => {
  const s = PHASE_STYLES[phase];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ring-1', s.bg, s.text, s.ring)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {phase}
    </span>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; onLabel: string; offLabel: string; onColor?: string }> = ({
  checked, onChange, onLabel, offLabel, onColor = 'bg-accent-600',
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={cn(
      'flex items-center gap-2 text-sm font-medium transition-colors select-none',
      checked ? 'text-slate-800' : 'text-slate-500',
    )}
  >
    <span className={cn(
      'relative inline-flex w-10 h-5 rounded-full transition-colors',
      checked ? onColor : 'bg-slate-200',
    )}>
      <span className={cn(
        'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0.5',
      )} />
    </span>
    {checked ? onLabel : offLabel}
  </button>
);

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
      <button
        type="button"
        onClick={() => { setOpen(o => !o); if (open) setSearch(''); }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors"
      >
        <span className="truncate">
          {selected.length === 0 ? 'Select capabilities…' : `${selected.length} selected`}
        </span>
        <ChevronRight className={cn('w-4 h-4 text-slate-400 transition-transform flex-shrink-0', open && 'rotate-90')} />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-50 text-accent-700 ring-1 ring-accent-200 rounded-full text-xs font-medium">
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-accent-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
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
                <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0', selected.includes(opt) ? 'bg-accent-600 border-accent-600' : 'border-slate-300')}>
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
  const set = <K extends keyof JourneyStep>(key: K, value: JourneyStep[K]) =>
    onUpdate({ ...step, [key]: value });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-accent-600" />
          <span className="text-sm font-semibold text-slate-700">Step Configuration</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete step"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Step ID & Name */}
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Step ID</label>
            <input
              value={step.stepId}
              onChange={e => set('stepId', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              placeholder="e.g. 180"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Step Name</label>
            <input
              value={step.stepName}
              onChange={e => set('stepName', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              placeholder="e.g. Device Selection"
            />
          </div>
        </div>

        {/* Phase */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phase</label>
          <div className="flex flex-wrap gap-2">
            {PHASES.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => set('phase', p)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 transition-all',
                  step.phase === p
                    ? cn(PHASE_STYLES[p].bg, PHASE_STYLES[p].text, PHASE_STYLES[p].ring, 'scale-105 shadow-sm')
                    : 'bg-white text-slate-500 ring-slate-200 hover:ring-slate-300',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Initiator */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Initiator</label>
          <Toggle
            checked={step.initiator === 'Customer'}
            onChange={v => set('initiator', v ? 'Customer' : 'System')}
            onLabel="Customer Initiated"
            offLabel="System Initiated"
          />
        </div>

        {/* Foundational */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <input
            type="checkbox"
            id={`foundational-${step.id}`}
            checked={step.isFoundational}
            onChange={e => set('isFoundational', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-accent-600 focus:ring-accent-500 cursor-pointer"
          />
          <label htmlFor={`foundational-${step.id}`} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
            <Star className="w-4 h-4 text-amber-500" />
            Foundational Step
          </label>
          <span className="text-xs text-slate-400 ml-auto">Core to every transaction</span>
        </div>

        {/* Friction Flag */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Friction Flag</label>
          <div className={cn('p-3 rounded-lg border transition-colors', step.hasFriction ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200')}>
            <Toggle
              checked={step.hasFriction}
              onChange={v => set('hasFriction', v)}
              onLabel="Friction Present"
              offLabel="No Friction"
              onColor="bg-rose-500"
            />
            {step.hasFriction && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1.5">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Friction Reason
                </label>
                <textarea
                  value={step.frictionReason}
                  onChange={e => set('frictionReason', e.target.value)}
                  rows={3}
                  placeholder="Describe the source of friction, customer impact, and any known root cause…"
                  className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent resize-none placeholder-slate-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Required Capabilities */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Required Capabilities</label>
          <MultiSelectDropdown
            options={CAPABILITY_OPTIONS}
            selected={step.requiredCapabilities}
            onChange={v => set('requiredCapabilities', v)}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Step Block (timeline item) ───────────────────────────────────────────────

const StepBlock: React.FC<{
  step: JourneyStep;
  isSelected: boolean;
  isLast: boolean;
  onSelect: () => void;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}> = ({ step, isSelected, isLast, onSelect, isDragOver, onDragStart, onDragOver, onDragLeave, onDrop }) => {
  const ps = PHASE_STYLES[step.phase];

  return (
    <div
      className={cn('flex items-stretch gap-0', isDragOver && 'opacity-50')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div className={cn('w-3 h-3 rounded-full border-2 border-white shadow-sm mt-4', ps.dot)} />
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
      </div>

      {/* Card */}
      <div
        draggable
        onDragStart={onDragStart}
        onClick={onSelect}
        className={cn(
          'flex-1 ml-3 mb-3 p-4 bg-white rounded-xl border-2 cursor-pointer transition-all group',
          isSelected
            ? 'border-accent-400 shadow-md shadow-accent-100'
            : 'border-slate-100 hover:border-slate-200 hover:shadow-sm',
          isDragOver && 'border-dashed border-accent-400',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Drag handle */}
            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 mt-0.5 flex-shrink-0 cursor-grab" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-400">{step.stepId}</span>
                <span className="text-sm font-semibold text-slate-800">{step.stepName}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <PhaseBadge phase={step.phase} />
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1',
                  step.initiator === 'Customer'
                    ? 'bg-sky-50 text-sky-700 ring-sky-200'
                    : 'bg-slate-100 text-slate-600 ring-slate-200',
                )}>
                  {step.initiator === 'Customer' ? <Users className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                  {step.initiator}
                </span>
                {step.isFoundational && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                    <Star className="w-3 h-3" />
                    Foundational
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {step.hasFriction && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 ring-1 ring-rose-200">
                <Flag className="w-3 h-3" /> Friction
              </span>
            )}
            {step.requiredCapabilities.length > 0 && (
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full ring-1 ring-slate-100">
                {step.requiredCapabilities.length} cap.
              </span>
            )}
            <ChevronRight className={cn('w-4 h-4 text-slate-300 transition-transform', isSelected && 'rotate-90 text-accent-500')} />
          </div>
        </div>
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

  return (
    <Layout noPadding>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden">

        {/* ── Journey Sidebar ──────────────────────────────────────────────── */}
        <aside className="w-full md:w-56 bg-white border-b md:border-b-0 md:border-r border-slate-100 flex flex-col flex-shrink-0 md:h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Route className="w-4 h-4 text-accent-600" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Journeys</span>
            </div>
            <button
              onClick={addJourney}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add New Journey
            </button>
          </div>

          <nav className="flex md:flex-col flex-1 p-2 gap-0.5 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto">
            {journeys.map(j => (
              <div
                key={j.id}
                className={cn(
                  'group flex-shrink-0 md:flex-shrink relative rounded-lg transition-colors',
                  j.id === activeJourneyId
                    ? 'bg-accent-50 border border-accent-200'
                    : 'border border-transparent hover:bg-slate-50',
                )}
              >
                <button
                  onClick={() => { setActiveJourneyId(j.id); setSelectedStepId(null); }}
                  className="w-full text-left px-3 py-2.5 pr-8 text-sm font-medium"
                >
                  <div className={cn('flex items-center justify-between gap-2', j.id === activeJourneyId ? 'text-accent-700' : 'text-slate-600')}>
                    <span className="truncate">{j.name}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{j.steps.length}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400 truncate">{j.primaryValueStream}</div>
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

          <div className="hidden md:block p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
            {journeys.length} journeys defined
          </div>
        </aside>

        {/* ── Main Area ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

          {/* Journey Metadata Header */}
          <div className="bg-white border-b border-slate-100 p-4 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 md:gap-6 mb-5">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Journey Name</label>
                <input
                  value={activeJourney.name}
                  onChange={e => updateJourney({ name: e.target.value })}
                  className="text-2xl font-display font-bold text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-accent-400 focus:outline-none w-full pb-0.5 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 pt-5">
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{activeJourney.id}</span>
                <span className={cn('text-xs font-semibold px-2 py-1 rounded-full ring-1', frictionCount > 0 ? 'bg-rose-50 text-rose-600 ring-rose-200' : 'bg-emerald-50 text-emerald-600 ring-emerald-200')}>
                  {frictionCount > 0 ? `${frictionCount} friction point${frictionCount > 1 ? 's' : ''}` : 'No friction'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Total Base Volume</label>
                <input
                  value={activeJourney.totalBaseVolume}
                  onChange={e => updateJourney({ totalBaseVolume: e.target.value })}
                  placeholder="e.g. 125,000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Primary Value Stream</label>
                <select
                  value={activeJourney.primaryValueStream}
                  onChange={e => updateJourney({ primaryValueStream: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                >
                  {VALUE_STREAMS.map(vs => <option key={vs}>{vs}</option>)}
                </select>
              </div>
            </div>

            {/* Phase summary strip */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-4">
              {PHASES.map(p => (
                <div key={p} className={cn('flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-semibold ring-1', PHASE_STYLES[p].bg, PHASE_STYLES[p].text, PHASE_STYLES[p].ring)}>
                  <span className={cn('w-2 h-2 rounded-full', PHASE_STYLES[p].dot)} />
                  {p} <span className="font-bold">{phaseCounts[p]}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{activeJourney.steps.length} steps total</span>
              </div>
            </div>
          </div>

          {/* Content split: Steps + Config Panel */}
          <div className="flex flex-col md:flex-row flex-1 min-h-0">

            {/* ── Step Timeline ──────────────────────────────────────────── */}
            <div className={cn('flex flex-col transition-all min-w-0', selectedStep ? 'md:w-[55%]' : 'flex-1')}>
              <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <ChevronsRight className="w-4 h-4 text-accent-600" />
                  <span className="text-sm font-semibold text-slate-700">Journey Step Sequence</span>
                  <span className="text-xs text-slate-400">— drag to reorder</span>
                </div>
                <button
                  onClick={addStep}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 hover:bg-accent-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Step
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeJourney.steps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                      <Route className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">No steps yet</p>
                    <p className="text-sm text-slate-400 mb-4">Add the first step to begin building this journey</p>
                    <button
                      onClick={addStep}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Step
                    </button>
                  </div>
                ) : (
                  <div>
                    {activeJourney.steps.map((step, idx) => (
                      <StepBlock
                        key={step.id}
                        step={step}
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
            </div>

            {/* ── Step Config Panel ──────────────────────────────────────── */}
            {selectedStep && (
              <div className="w-full md:w-[45%] border-t md:border-t-0 md:border-l border-slate-100 bg-white flex flex-col overflow-hidden">
                <StepConfigPanel
                  step={selectedStep}
                  onUpdate={updateStep}
                  onClose={() => setSelectedStepId(null)}
                  onDelete={() => deleteStep(selectedStep.id)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
