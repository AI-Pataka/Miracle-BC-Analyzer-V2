import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Plus, ChevronRight, ChevronDown,
  Trash2, X, Check, AlertCircle,
  Bot, Cpu, HelpCircle, CloudUpload, Loader2,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type AiCategory = 'AI Capability' | 'Non AI Capability' | 'TBD';
type AvailabilityLevel = '' | 'Industry' | 'Available' | 'Mature' | 'Optimized';

const AVAILABILITY_LEVELS: AvailabilityLevel[] = ['', 'Industry', 'Available', 'Mature', 'Optimized'];

const AVAILABILITY_STYLES: Record<string, string> = {
  Industry:   'bg-slate-100 text-slate-600 ring-1 ring-slate-300',
  Available:  'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  Mature:     'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  Optimized:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
};

const AVAILABILITY_PCT: Record<string, number> = {
  '': 0,
  Industry:   30,
  Available:  55,
  Mature:     78,
  Optimized:  100,
};

interface CapabilityRecord {
  id: string;
  l1: string;
  l2: string;
  l3: string;
  l4: string;
  description: string;
  aiCategory: AiCategory;
  systems: string[];
  owner: string;
  company: string;
  industry?: string;
  hasIt: boolean;
  availability: AvailabilityLevel;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AI_CATEGORIES: AiCategory[] = ['AI Capability', 'Non AI Capability', 'TBD'];

const AI_CATEGORY_STYLES: Record<AiCategory, string> = {
  'AI Capability':     'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  'Non AI Capability': 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  'TBD':               'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

const SYSTEM_SUGGESTIONS = [
  'Pega', 'Adobe CDP', 'Salesforce', 'SAP ERP', 'ServiceNow',
  'Workday', 'Oracle Financials', 'Confluence', 'SharePoint',
  'Power BI', 'Tableau', 'Azure ML', 'DataRobot', 'Kafka',
  'Elasticsearch', 'Sitecore', 'Informatica', 'MuleSoft', 'Genesys',
  'HubSpot', 'Marketo', 'Dynamics 365', 'Snowflake', 'Databricks',
];

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_DATA: CapabilityRecord[] = [
  { id: "TC001", l1: "Network Infrastructure Management", l2: "Radio Access Network Management", l3: "4G LTE RAN Operations", l4: "", description: "Managing and optimising 4G LTE eNodeB infrastructure for voice (VoLTE) and broadband services, including site commissioning, software lifecycle, interference management, and handover parameter tuning across licensed frequency bands.", aiCategory: "Non AI Capability", systems: ["3GPP Release 8–15", "eNodeB", "VoLTE", "SON", "Ericsson ENM"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC002", l1: "Network Infrastructure Management", l2: "Radio Access Network Management", l3: "5G NR RAN Operations (NSA)", l4: "", description: "Deploying and operating 5G New Radio in Non-Standalone mode, anchoring NR to the existing 4G EPC via dual-connectivity (EN-DC) to deliver enhanced mobile broadband on existing infrastructure investments.", aiCategory: "AI Capability", systems: ["3GPP Release 15–16", "EN-DC", "gNodeB", "Massive MIMO", "Ericsson Radio System"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC003", l1: "Network Infrastructure Management", l2: "Radio Access Network Management", l3: "5G NR RAN Operations (SA)", l4: "", description: "Deploying and operating 5G Standalone with a native 5G Core, enabling network slicing, ultra-low latency URLLC services, and advanced enterprise use cases requiring full 5G control plane independence.", aiCategory: "AI Capability", systems: ["3GPP Release 16+", "5GC (AMF", "SMF", "UPF)", "Ericsson Cloud RAN"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC004", l1: "Network Infrastructure Management", l2: "Radio Access Network Management", l3: "Open RAN Deployment", l4: "", description: "Implementing disaggregated, vendor-interoperable RAN using O-RAN Alliance open interfaces (O-RU, O-DU, O-CU) to reduce vendor dependency and enable software-driven innovation in the radio access layer.", aiCategory: "AI Capability", systems: ["O-RAN Alliance specs", "xApp", "rApp", "RIC (O-DU/O-CU/O-RU)", "Rakuten Symphony"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC005", l1: "Network Infrastructure Management", l2: "Radio Access Network Management", l3: "RAN Performance Optimisation", l4: "", description: "Continuously tuning radio parameters including antenna tilt, power settings, handover thresholds, load balancing, and carrier aggregation to maximise network capacity, coverage quality, and subscriber experience.", aiCategory: "AI Capability", systems: ["SON (Self-Organising Networks)", "MDT", "Ericsson ENM SON", "Nokia SON", "AI-driven optimisation tools"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC006", l1: "Network Infrastructure Management", l2: "Radio Access Network Management", l3: "Interference Management", l4: "", description: "Detecting and mitigating inter-cell and inter-technology interference through coordination between neighbouring base stations using ICIC, eICIC, and AI-assisted interference prediction.", aiCategory: "AI Capability", systems: ["ICIC", "eICIC", "CoMP", "X2/Xn interface", "SON interference modules"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC007", l1: "Network Infrastructure Management", l2: "Radio Access Network Management", l3: "Spectrum Management", l4: "", description: "Planning and managing licensed, unlicensed, and shared spectrum allocations across all frequency bands, including dynamic spectrum sharing (DSS) for 4G/5G coexistence.", aiCategory: "Non AI Capability", systems: ["DSS (Dynamic Spectrum Sharing)", "LAA", "LSA", "NR-U", "3GPP CA"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC008", l1: "Network Infrastructure Management", l2: "Radio Access Network Management", l3: "Handover and Mobility Management", l4: "", description: "Ensuring seamless subscriber mobility across cells, frequency layers, and technology generations through MRO and load-balancing handover parameter tuning.", aiCategory: "AI Capability", systems: ["X2/Xn handover", "A2/A3/A5 events", "MLB", "MRO", "3GPP RAN3"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC009", l1: "Network Infrastructure Management", l2: "Core Network Management", l3: "4G EPC Operations", l4: "", description: "Operating the 4G Evolved Packet Core including MME, SGW, PGW, HSS, and PCRF for session management, mobility anchoring, policy enforcement, and charging.", aiCategory: "Non AI Capability", systems: ["3GPP EPC", "MME", "SGW/PGW", "HSS", "PCRF"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC010", l1: "Network Infrastructure Management", l2: "Core Network Management", l3: "5G Core Network Operations", l4: "", description: "Operating a cloud-native 5G Core using service-based architecture (SBA) with containerised network functions to support network slicing, edge computing integration, and all 5G service types.", aiCategory: "AI Capability", systems: ["3GPP Release 15+ SBA", "AMF", "SMF", "UPF", "NSSF"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC011", l1: "Network Infrastructure Management", l2: "Core Network Management", l3: "IMS and VoLTE Core Management", l4: "", description: "Operating the IP Multimedia Subsystem to deliver VoLTE and VoNR voice services including P-CSCF, S-CSCF, I-CSCF, and Application Server components.", aiCategory: "Non AI Capability", systems: ["3GPP IMS", "P/S/I-CSCF", "TAS", "MRFC", "VoLTE"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC012", l1: "Network Infrastructure Management", l2: "Core Network Management", l3: "Policy and Charging Control", l4: "", description: "Defining, enforcing, and dynamically updating real-time subscriber policies for QoS, traffic prioritisation, fair-usage enforcement, and charging rules.", aiCategory: "AI Capability", systems: ["PCRF", "PCF", "OCS", "PCEF", "Gx/Gy/Gz Diameter interfaces"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC013", l1: "Network Infrastructure Management", l2: "Core Network Management", l3: "Network Slice Management", l4: "", description: "Creating, activating, and managing isolated end-to-end network slices with dedicated SLAs and resource guarantees for diverse use cases.", aiCategory: "AI Capability", systems: ["3GPP TS 28.530", "NSSF", "NSI/NSSI", "GSMA NG.116", "Ericsson Network Slice Manager"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC014", l1: "Network Infrastructure Management", l2: "Core Network Management", l3: "User Plane Function Optimisation", l4: "", description: "Optimising UPF placement across central, regional, and edge locations to minimise latency and support local traffic breakout for MEC.", aiCategory: "AI Capability", systems: ["3GPP UPF", "N4/PFCP interface", "MEC (ETSI MEC)", "AWS Wavelength", "Nokia MEC platform"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC015", l1: "Network Infrastructure Management", l2: "Transport Network Management", l3: "IP/MPLS Core Transport Operations", l4: "", description: "Operating the IP/MPLS backbone carrying all inter-domain traffic with label-switched paths, traffic engineering, and QoS differentiation.", aiCategory: "Non AI Capability", systems: ["MPLS", "RSVP-TE", "LDP", "SR-MPLS", "SRv6"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC016", l1: "Network Infrastructure Management", l2: "Transport Network Management", l3: "Optical Transport Operations", l4: "", description: "Managing DWDM and OTN optical infrastructure for high-capacity long-haul and metro transport, covering wavelength provisioning and protection switching.", aiCategory: "Non AI Capability", systems: ["DWDM", "OTN (G.709)", "Ciena WaveLogic", "Nokia 1830 PSS"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC017", l1: "Network Infrastructure Management", l2: "Transport Network Management", l3: "Microwave and Fixed Wireless Backhaul", l4: "", description: "Deploying and managing licensed and unlicensed microwave and E-Band links for cell site backhaul where fibre is not available.", aiCategory: "Non AI Capability", systems: ["ETSI EN 302 217", "E-Band 70/80 GHz", "V-Band 60 GHz", "XPIC", "ACAP"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC018", l1: "Network Infrastructure Management", l2: "Fixed Access Network Management", l3: "FTTH and GPON Operations", l4: "", description: "Operating fibre-to-the-home infrastructure using passive optical network technology, including OLT/ONT provisioning and subscriber activation.", aiCategory: "Non AI Capability", systems: ["GPON (ITU-T G.984)", "XGS-PON (G.9807)", "NG-PON2 (G.989)", "OLT", "ONT"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC019", l1: "Network Infrastructure Management", l2: "Fixed Access Network Management", l3: "DSL and Copper Access Management", l4: "", description: "Managing existing DSL infrastructure (ADSL2+, VDSL2, G.fast) on copper access networks, optimising line rates and vectoring.", aiCategory: "Non AI Capability", systems: ["VDSL2 (G.993.2)", "G.fast (G.9700)", "ADSL2+", "vectoring", "Nokia ISAM"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC020", l1: "Network Infrastructure Management", l2: "Network Virtualisation and Cloud Infrastructure", l3: "NFV Infrastructure Management", l4: "", description: "Managing the NFVI computing, storage, and networking resources and VIM that hosts virtualised network functions.", aiCategory: "Non AI Capability", systems: ["ETSI NFV ISG", "OpenStack", "VMware VIO", "Red Hat OpenShift", "VIM"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC021", l1: "Network Infrastructure Management", l2: "Network Virtualisation and Cloud Infrastructure", l3: "Cloud-Native Network Function Operations", l4: "", description: "Deploying and operating containerised network functions using cloud-native principles including microservices and Kubernetes orchestration.", aiCategory: "AI Capability", systems: ["Kubernetes", "Helm", "Istio", "Docker", "Prometheus"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC022", l1: "Network Infrastructure Management", l2: "Network Virtualisation and Cloud Infrastructure", l3: "Network Timing and Synchronisation", l4: "", description: "Distributing precision timing and frequency synchronisation across the entire network for 4G/5G RAN operations.", aiCategory: "Non AI Capability", systems: ["IEEE 1588v2 PTP", "SyncE", "ITU-T G.8265/G.8273/G.8275", "GNSS", "Microsemi"], owner: "Network Infrastructure", company: "", hasIt: false, availability: "" },
  { id: "TC023", l1: "Network Operations and Service Assurance", l2: "Fault Management", l3: "Alarm Surveillance and Collection", l4: "", description: "Continuously monitoring multi-vendor, multi-domain network elements for fault alarms using SNMP traps, NETCONF notifications, and syslog.", aiCategory: "Non AI Capability", systems: ["SNMP v2c/v3", "NETCONF notifications", "syslog", "gRPC gNMI", "IBM Netcool OMNIbus"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC024", l1: "Network Operations and Service Assurance", l2: "Fault Management", l3: "Alarm Correlation and Root Cause Analysis", l4: "", description: "Applying topology-aware correlation rules and ML inference to suppress duplicate alarms and identify root-cause faults.", aiCategory: "AI Capability", systems: ["IBM Netcool Impact", "Ericsson Expert Analytics", "Moogsoft AIOps"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC025", l1: "Network Operations and Service Assurance", l2: "Fault Management", l3: "Alarm Deduplication and Suppression", l4: "", description: "Automatically filtering redundant child alarms triggered by a single root fault event, reducing NOC alarm volumes by 60-90%.", aiCategory: "AI Capability", systems: ["IBM Netcool Impact", "Ericsson Expert Analytics", "Moogsoft", "BigPanda"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC026", l1: "Network Operations and Service Assurance", l2: "Fault Management", l3: "Service Impact Determination", l4: "", description: "Automatically determining which customer-facing services and SLA commitments are affected by a detected network fault.", aiCategory: "AI Capability", systems: ["TM Forum Service Impact Analysis", "Amdocs Service Assurance", "Nokia NSP impact analysis"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC027", l1: "Network Operations and Service Assurance", l2: "Fault Management", l3: "Automated Root Cause Isolation", l4: "", description: "Using graph-based topology traversal and ML inference to automatically identify the specific network element responsible for a degradation.", aiCategory: "AI Capability", systems: ["Neo4j", "TM Forum IG1205", "Ericsson Operations Engine RCA", "Nokia AI-driven RCA"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC028", l1: "Network Operations and Service Assurance", l2: "Fault Management", l3: "Incident Management", l4: "", description: "Managing the end-to-end lifecycle of network incidents from initial detection through diagnosis, escalation, repair, and closure.", aiCategory: "Non AI Capability", systems: ["ServiceNow ITOM/ITSM", "Jira Service Management", "Remedy", "ITIL incident management"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC029", l1: "Network Operations and Service Assurance", l2: "Fault Management", l3: "Incident Triage and Priority Assignment", l4: "", description: "Classifying incoming fault notifications by severity, customer impact magnitude, and SLA urgency to determine response priority.", aiCategory: "Non AI Capability", systems: ["ITIL priority matrix", "ServiceNow Priority Rules", "TM Forum severity definitions"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC030", l1: "Network Operations and Service Assurance", l2: "Fault Management", l3: "Automated Incident Remediation", l4: "", description: "Executing pre-defined or AI-generated runbook actions automatically in response to recognised fault patterns.", aiCategory: "AI Capability", systems: ["Ansible", "Terraform", "Python (Netmiko/Nornir)", "ONAP", "Ericsson AEAA"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC031", l1: "Network Operations and Service Assurance", l2: "Fault Management", l3: "Problem Management", l4: "", description: "Identifying chronic or recurring network fault patterns, determining their systemic root causes, and managing corrective actions.", aiCategory: "AI Capability", systems: ["ITIL problem management", "ServiceNow Problem", "Ericsson Expert Analytics"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC032", l1: "Network Operations and Service Assurance", l2: "Performance Management", l3: "KPI Collection and Aggregation", l4: "", description: "Continuously gathering performance counters from multi-vendor network elements using standards-based collection protocols.", aiCategory: "Non AI Capability", systems: ["SNMP polling", "NETCONF", "gRPC/gNMI streaming", "OpenConfig YANG", "Prometheus"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC033", l1: "Network Operations and Service Assurance", l2: "Performance Management", l3: "Streaming Telemetry", l4: "", description: "Collecting real-time, high-frequency network performance data from NEs using push-based gRPC/gNMI protocols.", aiCategory: "Non AI Capability", systems: ["gRPC", "gNMI", "OpenConfig", "YANG", "Apache Kafka"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC034", l1: "Network Operations and Service Assurance", l2: "Performance Management", l3: "KQI Calculation and Reporting", l4: "", description: "Translating low-level network KPIs into customer-experience KQIs for business-relevant service quality reporting.", aiCategory: "AI Capability", systems: ["TM Forum KQI model", "Ericsson Expert Analytics", "TEOCO Analytics", "Nokia NSP KQI"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC035", l1: "Network Operations and Service Assurance", l2: "Performance Management", l3: "Anomaly Detection and Predictive Analytics", l4: "", description: "Applying machine learning models to time-series performance data to identify anomalies and predict future degradations.", aiCategory: "AI Capability", systems: ["LSTM", "ARIMA", "Isolation Forest", "Databricks MLflow", "Ericsson Expert Analytics"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC036", l1: "Network Operations and Service Assurance", l2: "Performance Management", l3: "Predictive Maintenance", l4: "", description: "Using AI models to predict impending hardware failures or capacity exhaustion, enabling proactive replacement.", aiCategory: "AI Capability", systems: ["ML regression/classification", "SAS predictive analytics", "Ericsson AI/ML framework"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC037", l1: "Network Operations and Service Assurance", l2: "Performance Management", l3: "Network Capacity Management", l4: "", description: "Monitoring current network utilisation against capacity thresholds and forecasting future demand using ML models.", aiCategory: "AI Capability", systems: ["TEOCO ASSET", "NetCracker Capacity", "InfluxDB", "ML demand forecasting"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC038", l1: "Network Operations and Service Assurance", l2: "SLA Management", l3: "SLA Definition and Parametrisation", l4: "", description: "Translating customer contract requirements into measurable SLA parameters and configuring monitoring thresholds.", aiCategory: "Non AI Capability", systems: ["TM Forum TMF623", "MEF CE 2.0", "Amdocs Contract Management"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC039", l1: "Network Operations and Service Assurance", l2: "SLA Management", l3: "SLA Monitoring and Breach Detection", l4: "", description: "Continuously calculating SLA attainment and triggering real-time alerts when thresholds are breached.", aiCategory: "AI Capability", systems: ["TM Forum TMF623", "ServiceNow SLA module", "Ericsson Service Assurance"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC040", l1: "Network Operations and Service Assurance", l2: "SLA Management", l3: "Proactive SLA Risk Prediction", l4: "", description: "Predicting SLA breaches before they occur based on current performance trends and degradation trajectories.", aiCategory: "AI Capability", systems: ["ML predictive models", "Ericsson Expert Analytics", "Nokia AI-driven assurance"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC041", l1: "Network Operations and Service Assurance", l2: "SLA Management", l3: "Service Credit and Penalty Management", l4: "", description: "Calculating and processing service credits following confirmed SLA breaches, integrating with billing systems.", aiCategory: "Non AI Capability", systems: ["TM Forum billing integration", "Amdocs Revenue Management", "ServiceNow ITSM"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC042", l1: "Network Operations and Service Assurance", l2: "Closed-Loop Network Automation", l3: "Intent-Based Network Configuration", l4: "", description: "Translating high-level business intents into network configuration actions executed automatically across multi-domain infrastructure.", aiCategory: "AI Capability", systems: ["IBN", "YANG", "NETCONF", "ONAP", "ETSI ZSM ISG"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC043", l1: "Network Operations and Service Assurance", l2: "Closed-Loop Network Automation", l3: "Automated Network Remediation", l4: "", description: "Executing corrective network configuration actions automatically in response to detected faults or policy violations.", aiCategory: "AI Capability", systems: ["Ansible", "Terraform", "Python/Netmiko", "ONAP", "TM Forum ZSM"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC044", l1: "Network Operations and Service Assurance", l2: "Closed-Loop Network Automation", l3: "Self-Healing Network Execution", l4: "", description: "Enabling network elements to autonomously detect degradation, select recovery actions, execute them, and validate restoration.", aiCategory: "AI Capability", systems: ["TM Forum ANLET Level 4", "ETSI ZSM ISG", "O-RAN closed-loop xApps"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC045", l1: "Network Operations and Service Assurance", l2: "Network Change and Configuration Management", l3: "Configuration Baseline and Drift Detection", l4: "", description: "Maintaining a verified configuration baseline for all NEs and automatically detecting drift from that baseline.", aiCategory: "Non AI Capability", systems: ["NETCONF", "YANG", "Cisco NSO", "Ansible AWX", "Nokia NSP"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC046", l1: "Network Operations and Service Assurance", l2: "Network Change and Configuration Management", l3: "Network Change Automation", l4: "", description: "Automating end-to-end change execution including pre-change validation, scheduled rollout, and post-change verification.", aiCategory: "AI Capability", systems: ["Ansible", "Terraform", "Cisco NSO", "Nokia NSP change automation"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC047", l1: "Ordering and Fulfilment Management", l2: "Order Capture", l3: "Digital Self-Service Order Entry", l4: "", description: "Enabling customers to configure, price, and submit service orders through web portals and mobile apps.", aiCategory: "AI Capability", systems: ["React/PWA", "Salesforce Commerce Cloud", "Amdocs Digital", "Adobe Experience Manager"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC048", l1: "Ordering and Fulfilment Management", l2: "Order Capture", l3: "Real-Time Eligibility and Availability Check", l4: "", description: "Automatically verifying at order entry whether a customer is eligible for a requested product based on address, coverage, and credit.", aiCategory: "Non AI Capability", systems: ["TM Forum TMF620/TMF645", "address geocoding APIs", "credit bureau integration"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC049", l1: "Ordering and Fulfilment Management", l2: "Order Capture", l3: "Configure-Price-Quote", l4: "", description: "Enabling interactive configuration of complex multi-product bundles with real-time pricing and quotation generation.", aiCategory: "Non AI Capability", systems: ["Salesforce CPQ", "Apttus/Conga", "Oracle CPQ", "Amdocs CPQ"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC050", l1: "Ordering and Fulfilment Management", l2: "Order Capture", l3: "Assisted Channel Order Entry", l4: "", description: "Providing call centre agents and retail staff with tools to capture and submit orders on behalf of customers.", aiCategory: "Non AI Capability", systems: ["Pega Customer Service", "Salesforce Service Cloud", "Amdocs CES agent UI"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC051", l1: "Ordering and Fulfilment Management", l2: "Order Capture", l3: "B2B Enterprise Order Entry", l4: "", description: "Managing capture of complex enterprise orders including multi-site configurations and custom SLA requirements.", aiCategory: "Non AI Capability", systems: ["Salesforce CPQ", "Amdocs Enterprise OSS", "Nokia Netcracker Enterprise"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC052", l1: "Ordering and Fulfilment Management", l2: "Order Validation", l3: "Commercial Validation", l4: "", description: "Checking that ordered products, pricing, promotions, and eligibility are commercially correct and consistent.", aiCategory: "Non AI Capability", systems: ["Product Catalog API TMF620", "Amdocs Product Catalog", "Salesforce CPQ"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC053", l1: "Ordering and Fulfilment Management", l2: "Order Validation", l3: "Technical Feasibility Validation", l4: "", description: "Verifying that the ordered service can be technically delivered based on network coverage, port availability, and capacity.", aiCategory: "Non AI Capability", systems: ["TM Forum TMF645", "GIS/network inventory", "OSS feasibility APIs"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC054", l1: "Ordering and Fulfilment Management", l2: "Order Validation", l3: "Network Capacity Feasibility Check", l4: "", description: "Confirming sufficient network capacity to support the ordered service specifications.", aiCategory: "Non AI Capability", systems: ["TM Forum TMF639", "network inventory APIs", "capacity management platforms"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC055", l1: "Ordering and Fulfilment Management", l2: "Order Validation", l3: "Address and Coverage Verification", l4: "", description: "Geocoding and validating the customer service address against network coverage maps and infrastructure availability.", aiCategory: "Non AI Capability", systems: ["GIS platforms", "address validation APIs", "network coverage DBs"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC056", l1: "Ordering and Fulfilment Management", l2: "Order Decomposition", l3: "Product-to-Service Decomposition", l4: "", description: "Breaking down a commercial product order into its constituent customer-facing service components.", aiCategory: "Non AI Capability", systems: ["TM Forum TMF633", "product-to-service mapping engines", "Amdocs Catalog"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC057", l1: "Ordering and Fulfilment Management", l2: "Order Decomposition", l3: "Service-to-Resource Decomposition", l4: "", description: "Translating service-level components into specific network resource allocation requirements.", aiCategory: "Non AI Capability", systems: ["TM Forum TMF652", "IPAM (Infoblox)", "Nokia NSP Resource API"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC058", l1: "Ordering and Fulfilment Management", l2: "Order Decomposition", l3: "Automated Resource Selection", l4: "", description: "Automatically selecting optimal network resources for order fulfilment based on real-time availability.", aiCategory: "AI Capability", systems: ["Resource inventory APIs", "optimisation algorithms", "TM Forum TMF639/TMF652"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC059", l1: "Ordering and Fulfilment Management", l2: "Order Orchestration", l3: "Cross-Domain Service Orchestration", l4: "", description: "Coordinating fulfilment tasks across independent network and IT domains including dependency sequencing.", aiCategory: "Non AI Capability", systems: ["ONAP", "Camunda BPM", "Pega Process AI", "Amdocs Ordering"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC060", l1: "Ordering and Fulfilment Management", l2: "Order Orchestration", l3: "Order Fallout Management", l4: "", description: "Detecting, categorising, and managing order fulfilment failures with root-cause tracking.", aiCategory: "AI Capability", systems: ["Amdocs Order Management", "ServiceNow TM", "Pega fallout workflows"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC061", l1: "Ordering and Fulfilment Management", l2: "Order Orchestration", l3: "Automated Fallout Recovery", l4: "", description: "Automatically diagnosing the cause of an order fallout and executing recovery actions.", aiCategory: "AI Capability", systems: ["RPA (UiPath)", "Amdocs AI Order Recovery", "Pega Process AI"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC062", l1: "Ordering and Fulfilment Management", l2: "Order Orchestration", l3: "Zero-Touch Order Provisioning", l4: "", description: "Achieving fully automated end-to-end order fulfilment with zero human touchpoints across all domains.", aiCategory: "AI Capability", systems: ["TM Forum ZSM", "ONAP", "Nokia Netcracker ZTP", "Ericsson CEM"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC063", l1: "Ordering and Fulfilment Management", l2: "Service Provisioning", l3: "Network Element Provisioning", l4: "", description: "Translating service provisioning instructions into device-level configuration commands.", aiCategory: "Non AI Capability", systems: ["NETCONF", "YANG", "CLI (SSH)", "RESTCONF", "Cisco NSO"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC064", l1: "Ordering and Fulfilment Management", l2: "Service Provisioning", l3: "IP Address and Logical Resource Provisioning", l4: "", description: "Allocating and configuring IP addresses, VLANs, MPLS labels, and other logical resources for service delivery.", aiCategory: "Non AI Capability", systems: ["IPAM (Infoblox)", "CMDB", "TM Forum Resource Inventory API TMF639"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC065", l1: "Ordering and Fulfilment Management", l2: "Service Provisioning", l3: "eSIM Remote Provisioning", l4: "", description: "Remotely downloading and activating subscriber profiles onto eSIM-capable devices over-the-air.", aiCategory: "Non AI Capability", systems: ["GSMA SGP.02/SGP.22", "SM-DP+", "SM-DS", "Thales"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC066", l1: "Ordering and Fulfilment Management", l2: "Order Tracking and Status Management", l3: "Real-Time Order Status Visibility", l4: "", description: "Maintaining up-to-date order progress records through all fulfilment stages.", aiCategory: "Non AI Capability", systems: ["TM Forum TMF622", "Apache Kafka", "Amdocs Order Management"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC067", l1: "Ordering and Fulfilment Management", l2: "Order Tracking and Status Management", l3: "Proactive Customer Order Communication", l4: "", description: "Automatically notifying customers of order status milestones and any delays through preferred channels.", aiCategory: "AI Capability", systems: ["Salesforce Marketing Cloud", "Twilio", "Firebase Cloud Messaging"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC068", l1: "OSS/BSS Management", l2: "Product Catalogue Management", l3: "Commercial Product and Offer Definition", l4: "", description: "Creating and maintaining commercially sellable product and bundle definitions.", aiCategory: "Non AI Capability", systems: ["TM Forum TMF620", "Amdocs Product Catalog", "Salesforce CPQ"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC069", l1: "OSS/BSS Management", l2: "Product Catalogue Management", l3: "Service and Resource Catalogue", l4: "", description: "Maintaining definitions of all customer-facing services and the underlying network resources.", aiCategory: "Non AI Capability", systems: ["TM Forum TMF633", "TMF634", "Nokia Netcracker Catalog", "Amdocs Service Catalog"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC070", l1: "OSS/BSS Management", l2: "Billing and Revenue Management", l3: "Usage Rating and Online Charging", l4: "", description: "Processing usage records through rating engines to calculate charges based on applicable tariffs.", aiCategory: "Non AI Capability", systems: ["OCS", "Gy/Gz Diameter", "3GPP TS 32.240", "Amdocs Convergent Charging"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC071", l1: "OSS/BSS Management", l2: "Billing and Revenue Management", l3: "Invoice Generation and Presentment", l4: "", description: "Generating accurate customer invoices consolidating all charges, credits, adjustments, and taxes.", aiCategory: "Non AI Capability", systems: ["Amdocs Billing", "Oracle BRM", "eBilling portals", "PDF generation"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC072", l1: "OSS/BSS Management", l2: "Billing and Revenue Management", l3: "Revenue Assurance", l4: "", description: "Systematically detecting and preventing revenue leakage caused by billing errors, configuration mismatches, or fraud.", aiCategory: "AI Capability", systems: ["Subex HyperSense", "Ericsson Revenue Manager", "LATRO", "ML anomaly detection"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC073", l1: "OSS/BSS Management", l2: "Billing and Revenue Management", l3: "CDR Reconciliation and Gap Detection", l4: "", description: "Matching usage data records from network mediation against billing system records to identify discrepancies.", aiCategory: "Non AI Capability", systems: ["Mediation platforms", "CDR validation tools", "SQL reconciliation jobs"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC074", l1: "OSS/BSS Management", l2: "Network Inventory Management", l3: "Physical Network Inventory", l4: "", description: "Recording and managing all physical network assets with geographic location and connectivity relationships.", aiCategory: "Non AI Capability", systems: ["GIS-integrated inventory (Esri ArcGIS)", "Nokia NSP Physical Inventory"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC075", l1: "OSS/BSS Management", l2: "Network Inventory Management", l3: "Logical and Service Inventory", l4: "", description: "Maintaining records of all logical entities and their associations to physical resources and customer services.", aiCategory: "Non AI Capability", systems: ["TM Forum SID", "IPAM (Infoblox)", "Nokia NSP Logical Inventory"], owner: "OSS-BSS", company: "", hasIt: false, availability: "" },
  { id: "TC076", l1: "Customer and Digital Experience Management", l2: "Customer Relationship Management", l3: "Customer Profile and 360-Degree View", l4: "", description: "Consolidating all customer data into a single real-time record accessible across all platforms.", aiCategory: "AI Capability", systems: ["Salesforce CDP", "Adobe Real-Time CDP", "Amdocs CES", "Treasure Data"], owner: "Customer and Digital Experience", company: "", hasIt: false, availability: "" },
  { id: "TC077", l1: "Customer and Digital Experience Management", l2: "Customer Relationship Management", l3: "Customer Lifecycle Management", l4: "", description: "Managing all commercial and service transitions across the customer lifecycle.", aiCategory: "AI Capability", systems: ["Salesforce Marketing Cloud", "Pega CDH", "Amdocs Loyalty"], owner: "Customer and Digital Experience", company: "", hasIt: false, availability: "" },
  { id: "TC078", l1: "Customer and Digital Experience Management", l2: "Customer Relationship Management", l3: "Churn Prediction and Retention", l4: "", description: "Using ML models to identify customers at high churn risk and trigger personalised retention interventions.", aiCategory: "AI Capability", systems: ["Pega AI", "Salesforce Einstein", "Python (XGBoost)", "Databricks Feature Store"], owner: "Customer and Digital Experience", company: "", hasIt: false, availability: "" },
  { id: "TC079", l1: "Customer and Digital Experience Management", l2: "Digital Self-Service", l3: "Mobile Application Management", l4: "", description: "Developing and operating native mobile self-service apps for account management, usage monitoring, and support.", aiCategory: "AI Capability", systems: ["iOS (Swift)", "Android (Kotlin)", "React Native", "Flutter", "Firebase"], owner: "Customer and Digital Experience", company: "", hasIt: false, availability: "" },
  { id: "TC080", l1: "Customer and Digital Experience Management", l2: "Digital Self-Service", l3: "Conversational AI and Virtual Agent", l4: "", description: "Deploying AI-driven chatbots and virtual assistants handling first-level customer queries.", aiCategory: "AI Capability", systems: ["Google CCAI", "Amazon Lex", "Nuance", "IBM Watson", "Azure Bot Service"], owner: "Customer and Digital Experience", company: "", hasIt: false, availability: "" },
  { id: "TC081", l1: "Customer and Digital Experience Management", l2: "Omnichannel Contact Centre Operations", l3: "Intelligent Call Routing and IVR", l4: "", description: "Routing inbound contacts to the optimal agent or automation based on caller intent and account profile.", aiCategory: "AI Capability", systems: ["Genesys AI routing", "Amazon Connect ML", "NICE Enlighten AI", "Nuance"], owner: "Customer and Digital Experience", company: "", hasIt: false, availability: "" },
  { id: "TC082", l1: "Customer and Digital Experience Management", l2: "Omnichannel Contact Centre Operations", l3: "Agent-Assisted Service and Desktop", l4: "", description: "Providing agents with a unified desktop integrating CRM, billing, network status, and guided scripting tools.", aiCategory: "AI Capability", systems: ["Salesforce Service Cloud", "Pega Customer Service", "Genesys Agent Workspace"], owner: "Customer and Digital Experience", company: "", hasIt: false, availability: "" },
  { id: "TC083", l1: "Data and Analytics Management", l2: "Data Architecture and Governance", l3: "Data Quality Management", l4: "", description: "Systematically profiling, monitoring, and remediating data quality issues across source systems.", aiCategory: "AI Capability", systems: ["Informatica DQ", "Talend DQ", "dbt tests", "Great Expectations", "Collibra DQ"], owner: "Data and Analytics", company: "", hasIt: false, availability: "" },
  { id: "TC084", l1: "Data and Analytics Management", l2: "Data Architecture and Governance", l3: "Data Lineage and Catalogue", l4: "", description: "Tracking the provenance, transformations, and consumption of data assets across the enterprise.", aiCategory: "Non AI Capability", systems: ["Apache Atlas", "Collibra", "Alation", "dbt lineage", "Azure Purview"], owner: "Data and Analytics", company: "", hasIt: false, availability: "" },
  { id: "TC085", l1: "Data and Analytics Management", l2: "Advanced Analytics and AI/ML", l3: "Predictive Customer Analytics", l4: "", description: "Building and operationalising ML models that predict future customer behaviours.", aiCategory: "AI Capability", systems: ["Pega AI", "Salesforce Einstein", "Python (XGBoost)", "Databricks Feature Store"], owner: "Data and Analytics", company: "", hasIt: false, availability: "" },
  { id: "TC086", l1: "Data and Analytics Management", l2: "Advanced Analytics and AI/ML", l3: "Network AI and AIOps", l4: "", description: "Applying ML models to network performance and telemetry data to automate anomaly detection and predict failures.", aiCategory: "AI Capability", systems: ["Ericsson Expert Analytics", "Nokia MantaRay SON", "Databricks"], owner: "Data and Analytics", company: "", hasIt: false, availability: "" },
  { id: "TC087", l1: "Security and Compliance Management", l2: "Telecom Fraud Management", l3: "Real-Time Fraud Detection", l4: "", description: "Applying ML models and rule engines to real-time event streams to identify fraudulent activity patterns.", aiCategory: "AI Capability", systems: ["Subex HyperSense", "LATRO Protocol Signature", "streaming ML (Kafka+Flink)"], owner: "Security and Compliance", company: "", hasIt: false, availability: "" },
  { id: "TC088", l1: "Security and Compliance Management", l2: "Telecom Fraud Management", l3: "Signalling Security Management", l4: "", description: "Protecting SS7, Diameter, and GTP signalling protocols from exploitation.", aiCategory: "Non AI Capability", systems: ["SS7 firewall", "Diameter firewall", "GTP-C firewall"], owner: "Security and Compliance", company: "", hasIt: false, availability: "" },
  { id: "TC089", l1: "Partner Ecosystem Management", l2: "Interconnect and Roaming Management", l3: "Roaming Settlement and Financial Clearing", l4: "", description: "Processing inter-carrier roaming financial settlement including TAP file generation and dispute resolution.", aiCategory: "Non AI Capability", systems: ["GSMA TAP3", "RAP", "BCH", "Syniverse", "BICS"], owner: "Partner Ecosystem", company: "", hasIt: false, availability: "" },
  { id: "TC090", l1: "Partner Ecosystem Management", l2: "Interconnect and Roaming Management", l3: "Wholesale and Interconnect Billing", l4: "", description: "Billing and settling charges between carriers for voice interconnect, SMS A2P, and IP transit.", aiCategory: "Non AI Capability", systems: ["Wholesale billing platforms", "Amdocs Wholesale", "CSG Wholesale"], owner: "Partner Ecosystem", company: "", hasIt: false, availability: "" },
  { id: "TC091", l1: "Enterprise Services Management", l2: "Managed Network Services", l3: "SD-WAN Service Delivery", l4: "", description: "Deploying and managing software-defined WAN overlays for enterprise multi-site connectivity.", aiCategory: "AI Capability", systems: ["Cisco Catalyst SD-WAN", "VMware VeloCloud", "Fortinet SD-WAN"], owner: "Enterprise Services", company: "", hasIt: false, availability: "" },
  { id: "TC092", l1: "Enterprise Services Management", l2: "Managed Network Services", l3: "Enterprise SLA Management", l4: "", description: "Defining, monitoring, and reporting enterprise service SLAs with differentiated performance guarantees.", aiCategory: "Non AI Capability", systems: ["ServiceNow SLA", "Amdocs Enterprise", "TM Forum TMF623"], owner: "Enterprise Services", company: "", hasIt: false, availability: "" },
  { id: "TC093", l1: "Enterprise Services Management", l2: "IoT Connectivity and Platform Management", l3: "IoT Connectivity Management Platform", l4: "", description: "Managing provisioning, activation, and lifecycle management of IoT SIM/eSIM profiles at scale.", aiCategory: "Non AI Capability", systems: ["Ericsson IoT Accelerator", "Cisco Jasper", "Aeris", "GSMA SGP.02"], owner: "Enterprise Services", company: "", hasIt: false, availability: "" },
  { id: "TC094", l1: "Internal Operations Management", l2: "Financial Management", l3: "Revenue Accounting and Recognition", l4: "", description: "Recording, reconciling, and reporting revenue in compliance with IFRS 15/ASC 606.", aiCategory: "Non AI Capability", systems: ["SAP Revenue Accounting", "Oracle Revenue Management Cloud", "Zuora Revenue"], owner: "Internal Operations", company: "", hasIt: false, availability: "" },
  { id: "TC095", l1: "Internal Operations Management", l2: "Financial Management", l3: "Regulatory Financial Reporting", l4: "", description: "Producing statutory financial statements and regulatory filings.", aiCategory: "Non AI Capability", systems: ["SAP S/4HANA", "Oracle ERP", "Hyperion", "OneStream", "Workiva"], owner: "Internal Operations", company: "", hasIt: false, availability: "" },
  { id: "TC096", l1: "Internal Operations Management", l2: "Field Service Operations", l3: "Technician Scheduling and Dispatch", l4: "", description: "Optimising assignment and scheduling of field work orders to technicians using AI-driven scheduling.", aiCategory: "AI Capability", systems: ["Salesforce FSL Einstein Scheduling", "ServiceMax", "IFS FSM"], owner: "Internal Operations", company: "", hasIt: false, availability: "" },
  { id: "TC097", l1: "Internal Operations Management", l2: "Field Service Operations", l3: "Mobile Field Operations and Knowledge AI", l4: "", description: "Equipping field technicians with mobile apps providing work order details and AI-generated procedures.", aiCategory: "AI Capability", systems: ["Salesforce FSL mobile", "ServiceMax mobile", "Incedo Knowledge AI"], owner: "Internal Operations", company: "", hasIt: false, availability: "" },
  { id: "TC098", l1: "Internal Operations Management", l2: "Supply Chain Management", l3: "Network Equipment Procurement", l4: "", description: "Managing end-to-end procurement of network infrastructure equipment.", aiCategory: "Non AI Capability", systems: ["SAP Ariba", "Oracle Procurement Cloud", "Coupa"], owner: "Internal Operations", company: "", hasIt: false, availability: "" },
  { id: "TC099", l1: "Internal Operations Management", l2: "Supply Chain Management", l3: "Spare Parts and Depot Management", l4: "", description: "Maintaining optimal stock levels of network spare parts at depots and field locations.", aiCategory: "Non AI Capability", systems: ["SAP Materials Management", "Oracle Inventory Cloud", "ServiceMax Depot Repair"], owner: "Internal Operations", company: "", hasIt: false, availability: "" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(existing: CapabilityRecord[]): string {
  const nums = existing
    .map(r => parseInt(r.id.replace('CR', ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `CR${String(max + 1).padStart(3, '0')}`;
}

// ─── AI Category Badge ────────────────────────────────────────────────────────

const AiCategoryBadge: React.FC<{ category: AiCategory }> = ({ category }) => (
  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', AI_CATEGORY_STYLES[category])}>
    {category === 'AI Capability'     && <Bot        className="w-3 h-3 flex-shrink-0" />}
    {category === 'Non AI Capability' && <Cpu        className="w-3 h-3 flex-shrink-0" />}
    {category === 'TBD'               && <HelpCircle className="w-3 h-3 flex-shrink-0" />}
    {category}
  </span>
);

// ─── Systems Tag Editor ───────────────────────────────────────────────────────

interface SystemsEditorProps {
  systems: string[];
  onChange: (s: string[]) => void;
  onDone: () => void;
}

const SystemsEditor: React.FC<SystemsEditorProps> = ({ systems, onChange, onDone }) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addSystem = (s: string) => {
    const trimmed = s.trim();
    if (trimmed && !systems.includes(trimmed)) onChange([...systems, trimmed]);
    setInput('');
    setShowSuggestions(false);
  };

  const removeSystem = (s: string) => onChange(systems.filter(x => x !== s));

  const filtered = SYSTEM_SUGGESTIONS.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !systems.includes(s),
  );

  return (
    <div className="min-w-[200px]">
      <div className="flex flex-wrap gap-1 mb-1.5">
        {systems.map(s => (
          <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-700 text-xs rounded-md ring-1 ring-sky-200">
            {s}
            <button type="button" onClick={() => removeSystem(s)} aria-label={`Remove ${s}`} className="hover:text-red-500 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          autoFocus
          className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Type system + Enter…"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && input.trim()) { e.preventDefault(); addSystem(input); }
            if (e.key === 'Escape') onDone();
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute top-full left-0 z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
            {filtered.map(s => (
              <button
                key={s}
                type="button"
                onMouseDown={() => addSystem(s)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDone}
        className="mt-1.5 text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Done
      </button>
    </div>
  );
};

// ─── CSV Preview Modal ────────────────────────────────────────────────────────

interface CsvPreviewProps {
  preview: { rows: string[][]; parsed: CapabilityRecord[] };
  onImport: (records: CapabilityRecord[]) => void;
  onCancel: () => void;
}

const CsvPreviewModal: React.FC<CsvPreviewProps> = ({ preview, onImport, onCancel }) => {
  const COLS = ['L1', 'L2', 'L3', 'L4', 'Description', 'AI Category', 'Systems', 'Owner', 'Company', 'Availability'];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-900">CSV Import Preview</h2>
            <p className="text-sm text-slate-500 mt-0.5">{preview.parsed.length} rows ready to import</p>
          </div>
          <button onClick={onCancel} title="Close" aria-label="Close" className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Preview — first {Math.min(preview.rows.length, 3)} of {preview.parsed.length} rows
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {COLS.map(c => (
                    <th key={c} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-slate-600 max-w-[140px] truncate">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.parsed.length > 3 && (
            <p className="text-xs text-slate-400 mt-2 text-center">…and {preview.parsed.length - 3} more rows</p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors">
            Cancel
          </button>
          <button onClick={() => onImport(preview.parsed)} className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Check className="w-4 h-4" />
            Import {preview.parsed.length} {preview.parsed.length === 1 ? 'row' : 'rows'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Inline New Capability Row ────────────────────────────────────────────────

interface NewRowProps {
  initial: Partial<CapabilityRecord>;
  onSave: (r: Partial<CapabilityRecord>) => void;
  onCancel: () => void;
}

const NewCapabilityRow: React.FC<NewRowProps> = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState<Partial<CapabilityRecord>>({
    l1: '', l2: '', l3: '', l4: '', description: '', aiCategory: 'TBD', systems: [], owner: '', company: '', hasIt: false, availability: '',
    ...initial,
  });
  const [systemInput, setSystemInput] = useState('');
  const [error, setError] = useState('');

  const inputCls =
    'w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder:text-slate-300';

  const handleSave = () => {
    if (!form.l1?.trim()) { setError('L1 is required'); return; }
    if (!form.l2?.trim()) { setError('L2 is required'); return; }
    if (!form.l3?.trim()) { setError('L3 is required'); return; }
    onSave(form);
  };

  const addTag = () => {
    const s = systemInput.trim();
    if (s && !form.systems?.includes(s)) {
      setForm(f => ({ ...f, systems: [...(f.systems ?? []), s] }));
    }
    setSystemInput('');
  };

  return (
    <tr className="bg-indigo-50/60 border-b border-indigo-100">
      <td className="px-3 py-2 align-top">
        <input className={inputCls} placeholder="L1 *" value={form.l1} onChange={e => setForm(f => ({ ...f, l1: e.target.value }))} />
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inputCls} placeholder="L2 *" value={form.l2} onChange={e => setForm(f => ({ ...f, l2: e.target.value }))} />
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inputCls} placeholder="L3 *" value={form.l3} onChange={e => setForm(f => ({ ...f, l3: e.target.value }))} />
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inputCls} placeholder="L4" value={form.l4} onChange={e => setForm(f => ({ ...f, l4: e.target.value }))} />
      </td>
      <td className="px-3 py-2 align-top">
        <textarea className={cn(inputCls, 'resize-none')} rows={2} placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </td>
      <td className="px-3 py-2 align-top">
        <select aria-label="AI Category" className={inputCls} value={form.aiCategory} onChange={e => setForm(f => ({ ...f, aiCategory: e.target.value as AiCategory }))}>
          {AI_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap gap-1 mb-1">
          {form.systems?.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 text-sky-700 text-xs rounded ring-1 ring-sky-200">
              {s}
              <button type="button" onClick={() => setForm(f => ({ ...f, systems: f.systems?.filter(x => x !== s) }))} aria-label={`Remove ${s}`}>
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
        <input className={inputCls} placeholder="System + Enter" value={systemInput} onChange={e => setSystemInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inputCls} placeholder="Owner" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inputCls} placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
      </td>
      <td className="px-3 py-2 align-top text-center">
        <input type="checkbox" checked={form.hasIt ?? false} onChange={e => setForm(f => ({ ...f, hasIt: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400" />
      </td>
      <td className="px-3 py-2 align-top">
        <select aria-label="Availability" className={inputCls} value={form.availability} onChange={e => setForm(f => ({ ...f, availability: e.target.value as AvailabilityLevel }))}>
          {AVAILABILITY_LEVELS.map(m => <option key={m} value={m}>{m || '—'}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex flex-col gap-1.5">
          {error && (
            <p className="text-xs text-rose-500 flex items-center gap-1 whitespace-nowrap">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
            </p>
          )}
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleSave} className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors" title="Save">
              <Check className="w-4 h-4" />
            </button>
            <button type="button" onClick={onCancel} className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors" title="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const CapabilityDashboard: React.FC = () => {
  const { getIdToken, profile } = useAuth();
  const [records, setRecords]             = useState<CapabilityRecord[]>(SEED_DATA);
  const [search, setSearch]               = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [collapsedL1s, setCollapsedL1s]   = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell]     = useState<{ id: string; field: keyof CapabilityRecord } | null>(null);
  const [expandedDesc, setExpandedDesc]   = useState<Set<string>>(new Set());
  const [addingNew, setAddingNew]         = useState<{ forL1?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [csvError, setCsvError]           = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess]       = useState<string | null>(null);
  const [csvPreview, setCsvPreview]       = useState<{ rows: string[][]; parsed: CapabilityRecord[] } | null>(null);
  const [saving, setSaving]               = useState(false);
  const [loading, setLoading]             = useState(true);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  // ── Sync industry / company filter from user profile ──

  useEffect(() => {
    if (profile?.industry && !industryFilter) setIndustryFilter(profile.industry);
    if (profile?.client_company && !companyFilter) setCompanyFilter(profile.client_company);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // ── Fetch from backend on mount ──

  useEffect(() => {
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) { setLoading(false); return; }
        const res = await fetch('/api/config/capabilities', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.capabilities && data.capabilities.length > 0) {
            const mapped = data.capabilities.map((c: any) => ({
              id: c.id || generateId([]),
              l1: c.l1 || '', l2: c.l2 || '', l3: c.l3 || '', l4: c.l4 || '',
              description: c.description || '',
              aiCategory: c.aiCategory || c.ai_category || 'TBD',
              systems: c.systems || [],
              owner: c.owner || '',
              company: c.company || '',
              industry: c.industry || '',
              hasIt: c.hasIt ?? c.has_it ?? false,
              availability: c.availability || c.maturity_level || '',
            }));
            setRecords(mapped);
          }
        }
      } catch {
        // Keep SEED_DATA as fallback
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Save to backend ──

  const handleSaveToCloud = async () => {
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/config/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ capabilities: records }),
      });
      if (!res.ok) throw new Error('Save failed');
      setCsvSuccess('Capabilities saved to cloud.');
      setTimeout(() => setCsvSuccess(null), 3000);
    } catch (err: any) {
      setCsvError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ──

  const availableIndustries = useMemo(() => {
    const s = new Set<string>();
    records.forEach(r => { if (r.industry) s.add(r.industry); });
    return Array.from(s).sort();
  }, [records]);

  const availableCompanies = useMemo(() => {
    const s = new Set<string>();
    records.forEach(r => { if (r.company) s.add(r.company); });
    return Array.from(s).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    let base = records;
    // Industry filter: only exclude records that ARE tagged with a DIFFERENT industry
    if (industryFilter) {
      base = base.filter(r => !r.industry || r.industry === industryFilter);
    }
    // Company filter: only exclude records that ARE tagged with a DIFFERENT company
    if (companyFilter) {
      base = base.filter(r => !r.company || r.company === companyFilter);
    }
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(r =>
      r.l1.toLowerCase().includes(q) ||
      r.l2.toLowerCase().includes(q) ||
      r.l3.toLowerCase().includes(q) ||
      r.l4.toLowerCase().includes(q) ||
      r.company.toLowerCase().includes(q) ||
      r.systems.some(s => s.toLowerCase().includes(q)) ||
      r.owner.toLowerCase().includes(q),
    );
  }, [records, search, industryFilter, companyFilter]);

  const groupedRecords = useMemo(() => {
    const map = new Map<string, CapabilityRecord[]>();
    filteredRecords.forEach(r => {
      if (!map.has(r.l1)) map.set(r.l1, []);
      map.get(r.l1)!.push(r);
    });
    return map;
  }, [filteredRecords]);

  const kpis = useMemo(() => ({
    total:    records.length,
    l1Count:  new Set(records.map(r => r.l1)).size,
    aiCount:  records.filter(r => r.aiCategory === 'AI Capability').length,
    tbdCount: records.filter(r => r.aiCategory === 'TBD').length,
  }), [records]);

  // ── Handlers ──

  const toggleL1 = useCallback((l1: string) => {
    setCollapsedL1s(prev => {
      const next = new Set(prev);
      next.has(l1) ? next.delete(l1) : next.add(l1);
      return next;
    });
  }, []);

  const expandAll   = () => setCollapsedL1s(new Set());
  const collapseAll = () => setCollapsedL1s(new Set(records.map(r => r.l1)));

  const updateField = useCallback((id: string, field: keyof CapabilityRecord, value: unknown) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setEditingCell(null);
  }, []);

  const commitText = useCallback((id: string, field: keyof CapabilityRecord, value: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setEditingCell(null);
  }, []);

  const addRecord = useCallback((partial: Partial<CapabilityRecord>) => {
    const id = generateId(records);
    setRecords(prev => [
      ...prev,
      { id, l1: '', l2: '', l3: '', l4: '', description: '', aiCategory: 'TBD', systems: [], owner: '', company: '', industry: '', hasIt: false, availability: '', ...partial },
    ]);
    setExpandedDesc(prev => new Set(prev).add(id));
    setAddingNew(null);
  }, [records]);

  // Fix: auto-expand L1 and ensure form is visible
  const startAddingForL1 = useCallback((l1: string) => {
    setAddingNew({ forL1: l1 });
    setEditingCell(null);
    // Auto-expand the L1 group so the form row is visible
    setCollapsedL1s(prev => {
      const next = new Set(prev);
      next.delete(l1);
      return next;
    });
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    setDeleteConfirm(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(null); setCsvSuccess(null); setCsvPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = (ev.target?.result as string).replace(/\r/g, '').trim();
        const lines = text.split('\n');
        if (lines.length < 2) { setCsvError('CSV has no data rows.'); return; }

        const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
        const missing = ['l1', 'l2', 'l3'].filter(k => !header.includes(k));
        if (missing.length) { setCsvError('Missing required columns: ' + missing.join(', ')); return; }

        const idx = {
          l1:          header.indexOf('l1'),
          l2:          header.indexOf('l2'),
          l3:          header.indexOf('l3'),
          l4:          header.indexOf('l4'),
          description: header.indexOf('description'),
          aiCategory:  header.findIndex(h => h.includes('aicategory') || h === 'ai'),
          systems:     header.findIndex(h => h.includes('system') || h.includes('tech')),
          owner:       header.indexOf('owner'),
          company:     header.indexOf('company'),
          industry:    header.indexOf('industry'),
          maturity:    header.findIndex(h => h.includes('availability') || h.includes('maturity')),
        };

        const parsed: CapabilityRecord[] = [];
        const previewRows: string[][] = [];
        const errors: string[] = [];

        lines.slice(1).forEach((line, i) => {
          if (!line.trim()) return;
          const cols = (line.match(/("(?:[^"]|"")*"|[^,]*)/g) ?? line.split(','))
            .map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

          const l1 = cols[idx.l1] ?? '';
          const l2 = cols[idx.l2] ?? '';
          const l3 = cols[idx.l3] ?? '';
          if (!l1 || !l2 || !l3) { errors.push('Row ' + (i + 2) + ': l1, l2, l3 are required'); return; }

          let aiCategory: AiCategory = 'TBD';
          if (idx.aiCategory >= 0 && cols[idx.aiCategory]) {
            const raw = cols[idx.aiCategory].toLowerCase();
            if (raw.includes('non'))     aiCategory = 'Non AI Capability';
            else if (raw.includes('ai')) aiCategory = 'AI Capability';
          }

          const systems = idx.systems >= 0 && cols[idx.systems]
            ? cols[idx.systems].split(/[;|]/).map(s => s.trim()).filter(Boolean)
            : [];

          const rec: CapabilityRecord = {
            id:          generateId([...records, ...parsed]),
            l1, l2, l3,
            l4:          idx.l4 >= 0 ? (cols[idx.l4] ?? '') : '',
            description: idx.description >= 0 ? (cols[idx.description] ?? '') : '',
            aiCategory,
            systems,
            owner:       idx.owner >= 0 ? (cols[idx.owner] ?? '') : '',
            company:     idx.company >= 0 ? (cols[idx.company] ?? '') : '',
            industry:    idx.industry >= 0 ? (cols[idx.industry] ?? '') : '',
            hasIt:       false,
            availability: idx.maturity >= 0 ? (cols[idx.maturity] ?? '') as AvailabilityLevel : '',
          };
          parsed.push(rec);
          previewRows.push([l1, l2, l3, rec.l4, rec.description.slice(0, 40), aiCategory, systems.join(', '), rec.owner, rec.company, rec.availability]);
        });

        if (errors.length) {
          setCsvError(errors[0] + (errors.length > 1 ? ' (+' + (errors.length - 1) + ' more)' : ''));
          return;
        }
        if (!parsed.length) { setCsvError('No valid rows found in CSV.'); return; }
        setCsvPreview({ rows: previewRows, parsed });
      } catch {
        setCsvError('Failed to parse CSV. Please check the file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = (newRecords: CapabilityRecord[]) => {
    setRecords(prev => [...prev, ...newRecords]);
    setExpandedDesc(prev => {
      const next = new Set(prev);
      newRecords.forEach(r => next.add(r.id));
      return next;
    });
    setCsvPreview(null);
    setCsvSuccess('Successfully imported ' + newRecords.length + ' capabilities.');
    setTimeout(() => setCsvSuccess(null), 5000);
  };

  const handleExportCSV = () => {
    const header = 'l1,l2,l3,l4,description,aiCategory,systems,owner,company,industry,hasIt,availability';
    const rows = records.map(r =>
      [r.l1, r.l2, r.l3, r.l4, r.description, r.aiCategory, r.systems.join(';'), r.owner, r.company, r.industry || '', r.hasIt ? 'Yes' : 'No', r.availability]
        .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','),
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'capability-registry.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Cell renderer ──

  const renderCell = (record: CapabilityRecord, field: keyof CapabilityRecord) => {
    const isEditing = editingCell?.id === record.id && editingCell?.field === field;

    if (field === 'aiCategory') {
      if (isEditing) {
        return (
          <select autoFocus aria-label="AI Category" className="text-xs border border-indigo-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" value={record.aiCategory} onChange={e => updateField(record.id, 'aiCategory', e.target.value as AiCategory)} onBlur={() => setEditingCell(null)}>
            {AI_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        );
      }
      return (
        <button type="button" className="text-left hover:ring-2 hover:ring-indigo-300 rounded-full transition-all" onClick={() => setEditingCell({ id: record.id, field: 'aiCategory' })} title="Click to change">
          <AiCategoryBadge category={record.aiCategory} />
        </button>
      );
    }

    if (field === 'availability') {
      if (isEditing) {
        return (
          <select autoFocus aria-label="Availability" className="text-xs border border-indigo-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" value={record.availability} onChange={e => updateField(record.id, 'availability', e.target.value)} onBlur={() => setEditingCell(null)}>
            {AVAILABILITY_LEVELS.map(m => <option key={m} value={m}>{m || '—'}</option>)}
          </select>
        );
      }
      const m = record.availability;
      const pct = AVAILABILITY_PCT[m] ?? 0;
      if (!m) return <span className="text-slate-300 text-xs italic cursor-pointer" onClick={() => setEditingCell({ id: record.id, field: 'availability' })}>—</span>;
      return (
        <button type="button" className="w-full text-left hover:ring-2 hover:ring-indigo-200 rounded-md transition-all p-1" onClick={() => setEditingCell({ id: record.id, field: 'availability' })}>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1.5">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pct >= 78 ? 'bg-emerald-500' : pct >= 55 ? 'bg-blue-500' : pct >= 30 ? 'bg-amber-500' : 'bg-slate-300',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', AVAILABILITY_STYLES[m] || 'bg-slate-100 text-slate-600')}>{m}</span>
        </button>
      );
    }

    if (field === 'hasIt') {
      return (
        <button type="button" onClick={() => updateField(record.id, 'hasIt', !record.hasIt)} className="flex items-center justify-center w-full" title={record.hasIt ? 'Has it — click to toggle' : 'Does not have it — click to toggle'}>
          {record.hasIt
            ? <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            : <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-slate-400 transition-colors" />}
        </button>
      );
    }

    if (field === 'systems') {
      if (isEditing) {
        return (
          <SystemsEditor systems={record.systems} onChange={s => setRecords(prev => prev.map(r => r.id === record.id ? { ...r, systems: s } : r))} onDone={() => setEditingCell(null)} />
        );
      }
      return (
        <div className="cursor-pointer flex flex-wrap gap-1 min-h-[26px] p-1 rounded-lg hover:bg-slate-50 transition-colors" onClick={() => setEditingCell({ id: record.id, field: 'systems' })} title="Click to edit">
          {record.systems.length > 0
            ? record.systems.map(s => (
                <span key={s} className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{s}</span>
              ))
            : <span className="text-slate-300 text-xs italic">+ Add systems</span>}
        </div>
      );
    }

    if (field === 'description') {
      const isExpanded = expandedDesc.has(record.id);
      if (isEditing) {
        return (
          <textarea autoFocus aria-label="Description" placeholder="Enter description" className="w-full text-xs border border-indigo-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white resize-none" rows={4} defaultValue={record.description} onBlur={e => commitText(record.id, 'description', e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setEditingCell(null); }} />
        );
      }
      return (
        <div className="cursor-pointer" onClick={() => setEditingCell({ id: record.id, field: 'description' })}>
          <p className={cn('text-xs text-slate-600 leading-relaxed', !isExpanded && 'line-clamp-2')}>
            {record.description || <span className="text-slate-300 italic">No description — click to add</span>}
          </p>
          {record.description && record.description.length > 90 && (
            <button type="button" className="text-xs text-indigo-600 hover:text-indigo-700 mt-0.5 font-medium" onClick={e => {
              e.stopPropagation();
              setExpandedDesc(prev => { const next = new Set(prev); next.has(record.id) ? next.delete(record.id) : next.add(record.id); return next; });
            }}>
              {isExpanded ? '↑ Show less' : '↓ Read more'}
            </button>
          )}
        </div>
      );
    }

    // Default text (l1, l2, l3, l4, owner, company)
    const textValue = record[field] as string;
    if (isEditing) {
      return (
        <input autoFocus aria-label={String(field)} placeholder={String(field)} className="w-full text-xs border border-indigo-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" defaultValue={textValue} onBlur={e => commitText(record.id, field, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingCell(null); }} />
      );
    }
    return (
      <div className="cursor-pointer min-h-[24px] px-1 py-0.5 rounded hover:bg-slate-50 transition-colors text-xs text-slate-700" onClick={() => setEditingCell({ id: record.id, field })} title="Click to edit">
        {textValue || <span className="text-slate-300 italic">—</span>}
      </div>
    );
  };

  const COL_SPAN = 12;

  // ── Render ──

  return (
    <Layout>
      <div className="p-6 max-w-[1800px] mx-auto">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-[0.05em]">Governance &amp; Mapping</span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Capability Registry &amp; Systems Mapping
            </h1>
            <p className="text-slate-500 font-medium">
              Define, organise and govern enterprise capabilities across all business domains.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg"
            >
              Export CSV
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg"
            >
              Bulk Upload CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" aria-label="Upload CSV file" className="hidden" onChange={handleFileChange} />
            <button
              onClick={handleSaveToCloud}
              disabled={saving}
              className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all rounded-lg flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save to Cloud'}
            </button>
            <button
              onClick={() => { setAddingNew({}); setEditingCell(null); }}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Capability
            </button>
          </div>
        </div>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        {csvError && (
          <div className="mb-6 flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{csvError}</span>
            <button type="button" onClick={() => setCsvError(null)} aria-label="Dismiss error"><X className="w-4 h-4" /></button>
          </div>
        )}
        {csvSuccess && (
          <div className="mb-6 flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{csvSuccess}</span>
            <button type="button" onClick={() => setCsvSuccess(null)} aria-label="Dismiss"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── KPI Bento Grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 rounded-l-xl" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Capabilities</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{kpis.total}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 rounded-l-xl" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Business Domains</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{kpis.l1Count}</span>
              <span className="text-xs text-slate-400 font-medium">Active L1</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-500 rounded-l-xl" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Enabled</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{kpis.aiCount}</span>
              <span className="text-xs font-bold text-blue-600">
                {kpis.total > 0 ? Math.round((kpis.aiCount / kpis.total) * 100) : 0}% Coverage
              </span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pending TBD</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{kpis.tbdCount}</span>
              <span className="text-xs font-bold text-red-500">Requires Audit</span>
            </div>
          </div>
        </div>

        {/* ── Industry / Company Filters ───────────────────────────────────── */}
        {(availableIndustries.length > 0 || availableCompanies.length > 0) && (
          <div className="flex items-start gap-6 mb-4 flex-wrap bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            {availableIndustries.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Industry</span>
                <button
                  onClick={() => setIndustryFilter('')}
                  className={cn('text-xs px-2.5 py-1 rounded-full font-medium border transition-colors',
                    !industryFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}
                >All</button>
                {availableIndustries.map(ind => (
                  <button
                    key={ind}
                    onClick={() => setIndustryFilter(industryFilter === ind ? '' : ind)}
                    className={cn('text-xs px-2.5 py-1 rounded-full font-medium border transition-colors',
                      industryFilter === ind ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}
                  >{ind}</button>
                ))}
              </div>
            )}
            {availableCompanies.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Company</span>
                <button
                  onClick={() => setCompanyFilter('')}
                  className={cn('text-xs px-2.5 py-1 rounded-full font-medium border transition-colors',
                    !companyFilter ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}
                >All</button>
                {availableCompanies.map(co => (
                  <button
                    key={co}
                    onClick={() => setCompanyFilter(companyFilter === co ? '' : co)}
                    className={cn('text-xs px-2.5 py-1 rounded-full font-medium border transition-colors',
                      companyFilter === co ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}
                  >{co}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Search + Toolbar ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search capabilities, systems or owners…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button type="button" onClick={expandAll} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center gap-1 transition-colors">
              <ChevronDown className="w-3 h-3" /> Expand all
            </button>
            <button type="button" onClick={collapseAll} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center gap-1 transition-colors">
              <ChevronRight className="w-3 h-3" /> Collapse all
            </button>
          </div>
        </div>

        {/* ── Data Table ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading capabilities...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="overflow-y-auto max-h-[calc(100vh-420px)]">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="sticky top-0 z-20 bg-slate-50 border-b-2 border-slate-200">
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">L1</th>
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">L2</th>
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">L3</th>
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">L4</th>
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest min-w-[200px]">Description</th>
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">AI Category</th>
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[180px]">System / Tech Mapping</th>
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Owner</th>
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Company</th>
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Has It</th>
                        <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[130px]">Availability</th>
                        <th className="px-4 py-3.5 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">

                      {/* Top-level new capability row */}
                      {addingNew !== null && addingNew.forL1 === undefined && (
                        <NewCapabilityRow initial={{}} onSave={addRecord} onCancel={() => setAddingNew(null)} />
                      )}

                      {/* Empty state */}
                      {filteredRecords.length === 0 && addingNew === null && (
                        <tr>
                          <td colSpan={COL_SPAN}>
                            <div className="py-20 text-center">
                              <div className="flex flex-col items-center gap-3 text-slate-400">
                                <Search className="w-10 h-10 text-slate-200" />
                                <p className="font-semibold text-slate-500 text-base">No capabilities found</p>
                                <p className="text-sm">Try a different search term or add a new capability.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Grouped rows */}
                      {Array.from(groupedRecords.entries()).map(([l1, rows]) => (
                        <React.Fragment key={l1}>

                          {/* L1 group header row */}
                          <tr className="bg-slate-50/80 border-t-2 border-t-slate-200">
                            <td colSpan={COL_SPAN} className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleL1(l1)}
                                  className="flex items-center gap-2 hover:text-blue-700 transition-colors"
                                >
                                  {collapsedL1s.has(l1)
                                    ? <ChevronRight className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    : <ChevronDown  className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                                  <span className="font-bold text-sm text-blue-700 uppercase tracking-widest">{l1}</span>
                                </button>
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                                  {rows.length} {rows.length === 1 ? 'Capability' : 'Capabilities'}
                                </span>
                                <div className="ml-auto">
                                  <button
                                    type="button"
                                    onClick={() => startAddingForL1(l1)}
                                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add row
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Capability rows */}
                          {!collapsedL1s.has(l1) && rows.map(record => (
                            <tr key={record.id} className="hover:bg-slate-50/60 transition-colors group">
                              <td className="px-4 py-3 align-top">{renderCell(record, 'l1')}</td>
                              <td className="px-4 py-3 align-top">{renderCell(record, 'l2')}</td>
                              <td className="px-4 py-3 align-top">{renderCell(record, 'l3')}</td>
                              <td className="px-4 py-3 align-top">{renderCell(record, 'l4')}</td>
                              <td className="px-4 py-3 align-top max-w-xs">{renderCell(record, 'description')}</td>
                              <td className="px-4 py-3 align-top whitespace-nowrap">{renderCell(record, 'aiCategory')}</td>
                              <td className="px-4 py-3 align-top">{renderCell(record, 'systems')}</td>
                              <td className="px-4 py-3 align-top">{renderCell(record, 'owner')}</td>
                              <td className="px-4 py-3 align-top">{renderCell(record, 'company')}</td>
                              <td className="px-4 py-3 align-top text-center">{renderCell(record, 'hasIt')}</td>
                              <td className="px-4 py-3 align-top">{renderCell(record, 'availability')}</td>
                              <td className="px-4 py-3 align-top">
                                {deleteConfirm === record.id ? (
                                  <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => deleteRecord(record.id)} className="px-2 py-1 text-xs bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors whitespace-nowrap">Confirm</button>
                                    <button type="button" onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors">Cancel</button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); setDeleteConfirm(record.id); }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}

                          {/* Per-group new row */}
                          {!collapsedL1s.has(l1) && addingNew?.forL1 === l1 && (
                            <NewCapabilityRow initial={{ l1 }} onSave={addRecord} onCancel={() => setAddingNew(null)} />
                          )}

                        </React.Fragment>
                      ))}

                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex items-center justify-between text-xs text-slate-400">
                <span>
                  {records.length} total
                  {search && ` · ${filteredRecords.length} shown for "${search}"`}
                </span>
                <button
                  type="button"
                  onClick={() => { setAddingNew({}); setEditingCell(null); }}
                  className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Capability
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── CSV format hint ───────────────────────────────────────────────── */}
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">CSV Format: </span>
          Required:{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">l1, l2, l3</code>
          {'  ·  '}Optional:{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">l4, description, aiCategory, systems (pipe-separated), owner, company, availability</code>
        </div>

      </div>

      {csvPreview && (
        <CsvPreviewModal preview={csvPreview} onImport={handleImport} onCancel={() => setCsvPreview(null)} />
      )}
    </Layout>
  );
};
