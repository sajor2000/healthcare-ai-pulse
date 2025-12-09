import { useState } from "react";
import Layout from "@/components/layout/Layout";
import ReadingListItem from "@/components/dashboard/ReadingListItem";
import DraftPost from "@/components/dashboard/DraftPost";
import { CalendarDays, BookOpen, FileEdit } from "lucide-react";

// Mock data for demonstration
const mockReadingList = [
  {
    id: "1",
    title: "GPT-5 Shows Promise in Diagnostic Radiology: A Multi-Center Study",
    source: "Nature Medicine",
    summary: "A comprehensive study across 15 hospitals demonstrates GPT-5's ability to match radiologist performance in chest X-ray interpretation with 94% accuracy.",
    relevanceScore: 95,
    isRead: false,
    url: "#",
  },
  {
    id: "2",
    title: "FDA Clears AI-Powered ECG Analysis Tool for Atrial Fibrillation Detection",
    source: "STAT News",
    summary: "The agency approved a new AI algorithm capable of detecting irregular heart rhythms from standard 12-lead ECGs with unprecedented sensitivity.",
    relevanceScore: 88,
    isRead: false,
    url: "#",
  },
  {
    id: "3",
    title: "Large Language Models Transform Clinical Trial Matching",
    source: "JAMA Network",
    summary: "New research shows LLMs can reduce clinical trial matching time by 85% while improving patient-trial compatibility scores.",
    relevanceScore: 82,
    isRead: true,
    url: "#",
  },
  {
    id: "4",
    title: "AI-Driven Drug Discovery: Insilico Medicine's Latest Breakthrough",
    source: "BioPharma Dive",
    summary: "Insilico's generative AI platform identifies novel target for pulmonary fibrosis, entering Phase 2 trials in record time.",
    relevanceScore: 76,
    isRead: false,
    url: "#",
  },
  {
    id: "5",
    title: "Ambient AI Scribes Reduce Physician Documentation Time by 50%",
    source: "Healthcare IT News",
    summary: "Multi-site implementation study shows significant time savings and improved physician satisfaction with AI documentation assistants.",
    relevanceScore: 71,
    isRead: false,
    url: "#",
  },
  {
    id: "6",
    title: "Microsoft and Epic Partnership Expands AI Integration in EHRs",
    source: "Modern Healthcare",
    summary: "The collaboration brings Azure AI capabilities directly into Epic workflows, enabling smarter clinical decision support.",
    relevanceScore: 68,
    isRead: false,
    url: "#",
  },
  {
    id: "7",
    title: "DeepMind's AlphaFold Database Expands to Include Protein Interactions",
    source: "Science Daily",
    summary: "The expanded database now includes predictions for protein-protein interactions, opening new avenues for drug development.",
    relevanceScore: 65,
    isRead: false,
    url: "#",
  },
  {
    id: "8",
    title: "AI-Powered Pathology Gains Traction in Cancer Diagnosis",
    source: "The Lancet Digital Health",
    summary: "Studies confirm AI assistance improves pathologist accuracy in identifying subtle cancer markers across multiple tumor types.",
    relevanceScore: 62,
    isRead: false,
    url: "#",
  },
  {
    id: "9",
    title: "Regulatory Framework for AI in Healthcare: EU Leads the Way",
    source: "Reuters Health",
    summary: "European Union finalizes comprehensive guidelines for AI medical device certification, setting global precedent.",
    relevanceScore: 55,
    isRead: false,
    url: "#",
  },
  {
    id: "10",
    title: "Telehealth AI Triage Systems Improve ER Wait Times",
    source: "Health Affairs",
    summary: "Pilot programs demonstrate AI-powered triage can reduce emergency department congestion by 30% without compromising care quality.",
    relevanceScore: 52,
    isRead: false,
    url: "#",
  },
];

type DraftPostStatus = "draft" | "approved" | "posted";

interface DraftPostData {
  id: string;
  content: string;
  postType: string;
  status: DraftPostStatus;
}

const mockDraftPosts: DraftPostData[] = [
  {
    id: "1",
    content: `🔬 Breaking: GPT-5 matches radiologist performance in chest X-ray interpretation!

A new multi-center study across 15 hospitals shows 94% accuracy in diagnostic radiology. This isn't about replacing physicians—it's about augmenting our capabilities.

Key takeaways:
• Faster turnaround times
• Consistent 24/7 coverage
• Second-opinion validation

The future of radiology is collaborative AI. What are your thoughts on AI-assisted diagnostics?

#HealthcareAI #Radiology #MedicalImaging #AIinMedicine`,
    postType: "insight",
    status: "draft",
  },
  {
    id: "2",
    content: `📊 AI is revolutionizing clinical trial matching.

New JAMA research shows LLMs can reduce trial matching time by 85%! For patients waiting for breakthrough treatments, this efficiency gain is life-changing.

The bottleneck in clinical research has always been patient recruitment. AI is solving this at scale.

Who else is excited about faster paths to new treatments?

#ClinicalTrials #HealthTech #PatientCare #Innovation`,
    postType: "commentary",
    status: "draft",
  },
  {
    id: "3",
    content: `💡 50% less time on documentation = more time with patients.

That's what ambient AI scribes are delivering for physicians. As someone who's spent countless hours on EHR documentation, this resonates deeply.

The best technology is invisible—it works in the background while we focus on what matters: patient care.

What documentation challenges do you face in your practice?

#PhysicianBurnout #HealthcareAI #EHR #PatientCare`,
    postType: "personal",
    status: "draft",
  },
];

const Index = () => {
  const [readingList, setReadingList] = useState(mockReadingList);
  const [draftPosts, setDraftPosts] = useState(mockDraftPosts);

  const handleToggleRead = (id: string) => {
    setReadingList(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isRead: !item.isRead } : item
      )
    );
  };

  const handleUpdatePost = (id: string, content: string) => {
    setDraftPosts(prev =>
      prev.map(post =>
        post.id === id ? { ...post, content } : post
      )
    );
  };

  const handleApprovePost = (id: string) => {
    setDraftPosts(prev =>
      prev.map(post =>
        post.id === id ? { ...post, status: "approved" as DraftPostStatus } : post
      )
    );
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const unreadCount = readingList.filter(item => !item.isRead).length;

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CalendarDays className="h-4 w-4" />
            <span className="text-sm">{today}</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Good morning, <span className="gradient-text">Doctor</span>
          </h1>
          <p className="text-muted-foreground">
            {unreadCount} articles to review • 3 draft posts ready for your review
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reading List Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Today's Reading List</h2>
              <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                {readingList.length} articles
              </span>
            </div>
            <div className="space-y-3">
              {readingList.map((item, index) => (
                <ReadingListItem
                  key={item.id}
                  {...item}
                  onToggleRead={() => handleToggleRead(item.id)}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Draft Posts Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileEdit className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Draft Posts</h2>
              <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                {draftPosts.length} drafts
              </span>
            </div>
            <div className="space-y-4">
              {draftPosts.map((post, index) => (
                <DraftPost
                  key={post.id}
                  {...post}
                  onUpdate={handleUpdatePost}
                  onApprove={handleApprovePost}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
