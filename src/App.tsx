import { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isSameDay, getDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  Check, Zap, AlertCircle, Utensils, Calendar as CalendarIcon, 
  Trophy, Droplets, Flame, Target, Info, Brain, Activity,
  Moon, Sun, Laptop, TrendingUp, Video as FileVideo, Loader2,
  ChevronRight, Sparkles, Sliders, Dna, X
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { GoogleGenAI } from "@google/genai";

// UI Components
import { base44 } from '@/api/base44Client';
import { getIntentColor } from '@/lib/scheduleData';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// --- PK LOGO ---
function PKLogo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-hidden="true"
    >
      {/* Spine */}
      <path 
        d="M50 20V80" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="round" 
      />
      {/* K Arms (Left) */}
      <path 
        d="M50 50L25 20M50 50L25 80" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* P Loop (Right) */}
      <path 
        d="M50 20H70C82 20 82 50 70 50H50" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

// --- THEME TOGGLE ---
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-full"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5 text-primary" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

// --- DATA CONSTANTS ---

const WEEKLY_PROGRAM = {
  1: { name: "Monday", type: "Green", focus: "High-Intent & Lower Body", throwing: "Long Toss (300ft) + Pull-Downs", lifting: "Trap Bar DL, Goblet Squats, Lateral Bounds" },
  2: { name: "Tuesday", type: "Red", focus: "Active Recovery & Mobility", throwing: "Light Catch (120-150ft)", lifting: "Arm Care (Soft Tissue) & Core holds" },
  3: { name: "Wednesday", type: "Yellow", focus: "Hybrid & Rotational Power", throwing: "PlyoCare Drills & Long Toss (Stretch Out)", lifting: "Med Ball Rotational Throws" },
  4: { name: "Thursday", type: "Red", focus: "Recovery & Arm Health", throwing: "Optional Light Catch / Mental Training", lifting: "Farmer's Carries & Scap Stability" },
  5: { name: "Friday", type: "Green", focus: "Mound Velocity & Upper Body", throwing: "Max-Effort Mound Velo (10-15 throws)", lifting: "Weighted Pushups, Pull-ups, DB Rows" },
  6: { name: "Saturday", type: "Red", focus: "Active Rest", throwing: "Aerobic Flush (Jog/Cycle)", lifting: "Full Body Stretching (Hip/T-Spine)" },
  0: { name: "Sunday", type: "Rest", focus: "Full Rest & Prep", throwing: "None", lifting: "Sleep 8+ hours & Meal Prep" },
};

// --- ROUTINE DATA ---
const PRE_THROW_ROUTINE = {
  j_bands: {
    title: "I. J-Bands: Tissue Activation",
    notes: "1 set of 10–12 reps. Keep core braced.",
    items: [
      "Overhead Extensions",
      "Side Extensions",
      "Internal Rotation (Elbow Pinned)",
      "External Rotation (Elbow Pinned)",
      "Elevated Internal Rotation (90/90)",
      "Elevated External Rotation (90/90)",
      "Forward Flies (Bear Hug)",
      "Reverse Flies (Squeeze Scaps)"
    ]
  },
  shoulder_tube: {
    title: "II. Shoulder Tube: Rhythmic Stabilization",
    notes: "30s per position. Short, violent micro-shakes.",
    items: [
      "Neutral (Side, front-to-back)",
      "90/90 (Shoulder height, up-and-down)",
      "Extension (Target reach, side-to-side)"
    ]
  },
  mobility: {
    title: "III. Thoracic & Hip Mobility",
    notes: "Focus on upper back and hip rotation.",
    items: [
      "Bench T-Spine Mobilization (2x15)",
      "Cat-Cow (15 reps)",
      "90/90 Hip Switches (10/side)",
      "Scapular Push-ups (15 reps)"
    ]
  },
  movement_prep: {
    title: "IV. Movement Prep",
    notes: "Nervous system wake-up.",
    items: [
      "Dry Skaters (10 reps, lateral load)",
      "Dry Rockers (10 reps, momentum drive)"
    ]
  }
};

const PLYO_DRILLS = {
  Green: [
    { name: "Pivot Picks", balls: "Orange → Green → Grey → Blue", reps: "8 total (2 each)" },
    { name: "Walking Windups", balls: "Orange → Green → Grey → Blue → Purple", reps: "10 total (2 each)" },
    { name: "Step-Backs", balls: "Orange → Green → Grey → Blue → Purple", reps: "10 total (2 each)" },
    { name: "Roll-ins", balls: "Green → Grey → Blue → Purple", reps: "8 total (2 each)" },
    { name: "Walking Torque", balls: "Grey → Blue → Purple", reps: "6 total (2 each)" }
  ],
  Yellow: [
    { name: "Pivot Picks", balls: "Orange → Green", reps: "10 total (5 each)" },
    { name: "Figure-8s", balls: "Green, Grey", reps: "10 total (5 each)" },
    { name: "Janitor Throws", balls: "Grey, Blue", reps: "10 total (5 each)" },
    { name: "Half-Moons", balls: "Orange, Green", reps: "10 total (5 each)" },
    { name: "Walking Torque", balls: "Grey, Blue", reps: "10 total (5 each)" }
  ],
  Red: [
    { name: "Pivot Picks", balls: "Blue (5oz)", reps: "10 reps (40% effort)" },
    { name: "Reverse Throws", balls: "Black (2lb)", reps: "10 reps" }
  ]
};

const WEIGHTED_PROGRAM = {
  Green: [
    { drill: "Pivot Picks", ball: "Yellow (11oz)", reps: "8-10", focus: "90° Vertical Forearm" },
    { drill: "Rockers", ball: "Green (9oz)", reps: "8-10", focus: "Forward Momentum" },
    { drill: "Walking Windup", ball: "Red (7oz)", reps: "8-10", focus: "Mass Transfer / Whip" },
    { drill: "Step-Backs", ball: "Orange (6oz)", reps: "5 ONLY", focus: "Glute Load / Drive" },
    { drill: "Shuffle Pulldown", ball: "Blue (4oz)", reps: "8-10", focus: "High-Intensity Speed" },
    { drill: "Running Start", ball: "Purple (3oz)", reps: "8-10", focus: "Max Hand Acceleration" }
  ],
  Yellow: [
    { drill: "Pivot Picks", ball: "Yellow (11oz)", reps: "8-10", focus: "Vertical Arm Path" },
    { drill: "Rockers", ball: "Green (9oz)", reps: "8-10", focus: "Stay Forward" },
    { drill: "Walking Windup", ball: "Red (7oz)", reps: "8-10", focus: "Rhythm & T-Spine" },
    { drill: "Step-Backs", ball: "Orange (6oz)", reps: "5 ONLY", focus: "Controlled Drive" }
  ],
  Red: [
    { drill: "Recovery Throws", ball: "Blue (5oz)", reps: "15-20", focus: "Easy effort, blood flow" }
  ]
};

const MEAL_PLAN = [
  { time: "07:00 AM", item: "16-20oz Water (Hydrate First)" },
  { time: "07:15 AM", item: "Oats (PB/Seeds) + 3 Eggs (40g Protein)" },
  { time: "10:30 AM", item: "Protein Smoothie + 5g Creatine" },
  { time: "01:30 PM", item: "Power Bowl: Lean Protein + Potatoes/Rice" },
  { time: "04:30 PM", item: "Energy Bar + Fruit / Potato Bites" },
  { time: "07:30 PM", item: "Salmon/Fish + Quinoa + Greens" },
  { time: "09:30 PM", item: "Casein Shake or Light Smoothie" },
];

const ARM_PREP_PROGRAM = [
  { name: "Overhead Extensions (J-Bands)", reps: 15 },
  { name: "Side Extensions (J-Bands)", reps: 15 },
  { name: "Internal Rotation (Pinn)", reps: 15 },
  { name: "External Rotation (Pinn)", reps: 15 },
  { name: "Elevated IR (90/90)", reps: 15 },
  { name: "Elevated ER (90/90)", reps: 15 },
  { name: "Forward Flies / Hugs", reps: 15 },
  { name: "Reverse Flies / Scaps", reps: 15 },
  { name: "Shoulder Tube (Neutral)", reps: 30 },
  { name: "Shoulder Tube (90/90)", reps: 30 },
];

// --- SPLASH SCREEN ---
function SplashScreen() {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        transition: { duration: 0.8, ease: "easeInOut" }
      }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Background Pulse */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0.1 }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeOut" 
          }}
          className="absolute inset-0 bg-primary rounded-full blur-3xl"
        />

        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2
          }}
          className="h-28 w-28 rounded-3xl bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary-rgb),0.5)] z-10"
        >
          <PKLogo className="w-20 h-20 text-primary-foreground" />
        </motion.div>

        {/* Text Animation */}
        <div className="mt-8 overflow-hidden">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ 
              duration: 0.8, 
              delay: 0.8, 
              ease: [0.16, 1, 0.3, 1] 
            }}
            className="text-center"
          >
            <h1 className="text-4xl font-[900] tracking-tighter uppercase italic text-primary leading-none">
              90 or Die
            </h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] mt-3 opacity-60">
              Performance Lab
            </p>
          </motion.div>
        </div>
      </div>

      {/* Progress Line */}
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2, ease: "easeInOut", delay: 0.2 }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-primary/20 origin-left overflow-hidden"
      >
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-full h-full bg-primary"
        />
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("training");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 transition-colors duration-300">
      <AnimatePresence mode="wait">
        {loading && <SplashScreen key="splash" />}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: loading ? 0.3 : 0 }}
        className="p-4 max-w-md mx-auto"
      >
        
        <header className="flex justify-between items-center mb-8 pt-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] rotate-3">
              <PKLogo className="w-10 h-10 text-primary-foreground -rotate-3" />
            </div>
            <div>
              <h1 className="text-3xl font-[900] tracking-tighter uppercase italic text-primary leading-none">90 or Die</h1>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1.5 opacity-70">Performance Lab</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <ThemeToggle />
             <div className="h-11 w-11 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20 hover:bg-secondary/20 transition-colors cursor-pointer group">
               <Trophy className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />
             </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 h-14 bg-muted/20 p-1.5 rounded-2xl border border-border/40 overflow-x-auto whitespace-nowrap">
            <TabsTrigger value="training" className="flex flex-col items-center justify-center gap-1 font-black uppercase text-[7px] rounded-xl transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg active:scale-95 shrink-0">
              <CalendarIcon className="w-3 h-3" /> <span>Train</span>
            </TabsTrigger>
            <TabsTrigger value="log" className="flex flex-col items-center justify-center gap-1 font-black uppercase text-[7px] rounded-xl transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg active:scale-95 shrink-0">
              <Activity className="w-3 h-3" /> <span>Log</span>
            </TabsTrigger>
            <TabsTrigger value="mechanics" className="flex flex-col items-center justify-center gap-1 font-black uppercase text-[7px] rounded-xl transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg active:scale-95 shrink-0">
              <FileVideo className="w-3 h-3" /> <span>AI Lab</span>
            </TabsTrigger>
            <TabsTrigger value="track" className="flex flex-col items-center justify-center gap-1 font-black uppercase text-[7px] rounded-xl transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg active:scale-95 shrink-0">
              <TrendingUp className="w-3 h-3" /> <span>Stats</span>
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="flex flex-col items-center justify-center gap-1 font-black uppercase text-[7px] rounded-xl transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg active:scale-95 shrink-0">
              <Utensils className="w-3 h-3" /> <span>Fuel</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="training" className="space-y-4 outline-none">
            <TrainingTab />
          </TabsContent>

          <TabsContent value="log" className="space-y-4 outline-none">
            <LogTab />
          </TabsContent>

          <TabsContent value="mechanics" className="space-y-4 outline-none">
            <MechanicsTab />
          </TabsContent>

          <TabsContent value="track" className="space-y-4 outline-none">
            <TrackTab />
          </TabsContent>

          <TabsContent value="nutrition" className="space-y-4 outline-none">
            <NutritionTab />
          </TabsContent>
        </Tabs>

        <footer className="mt-12 mb-8 flex flex-col items-center justify-center gap-4 opacity-40">
          <PKLogo className="w-8 h-8 text-muted-foreground" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">© 2026 PK Performance Lab</p>
        </footer>
      </motion.div>
    </div>
  );
}

function GoalTracker({ value, goal, label, unit, colorClass }: { value: number, goal: number, label: string, unit: string, colorClass: string }) {
  const percentage = Math.min(100, (value / goal) * 100);
  const diff = Math.max(0, goal - value);
  const radius = 30;
  const strokeDasharray = 2 * Math.PI * radius;
  const offset = strokeDasharray - (percentage / 100) * strokeDasharray;

  return (
    <div className="flex flex-col items-center gap-3 group">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90 filter drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]">
          <circle
            cx="40"
            cy="40"
            r={radius}
            className="stroke-muted/20"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            className={cn("transition-all duration-1000 ease-out", colorClass)}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-[900] leading-none tracking-tighter font-mono">{value > 0 ? value.toFixed(1) : '--'}</span>
          <span className="text-[7px] font-black uppercase opacity-40 leading-none mt-0.5">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest mb-1 group-hover:text-primary transition-colors">{label}</p>
        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
          <p className="text-[9px] font-black text-primary uppercase">
            {diff > 0 ? `${diff.toFixed(1)} ${unit} left` : 'GOAL REACHED!'}
          </p>
        </div>
      </div>
    </div>
  );
}

function TrainingTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const today = new Date();
  const dayOfWeek = getDay(today) as keyof typeof WEEKLY_PROGRAM;
  const todayPlan = WEEKLY_PROGRAM[dayOfWeek];

  const { data: entries = [] } = useQuery({
    queryKey: ['throwing-entries'],
    queryFn: () => base44.entities.ThrowingEntry.list(),
  });

  const { data: trackEntries = [] } = useQuery({
    queryKey: ['track-entries'],
    queryFn: () => base44.entities.TrackEntry.list(),
  });

  const maxVelo = useMemo(() => {
    const throwingVelos = entries.map((e: any) => parseFloat(e.peak_5oz_velo) || 0);
    const trackVelos = trackEntries.map((e: any) => parseFloat(e.velocity) || 0);
    return Math.max(0, ...throwingVelos, ...trackVelos);
  }, [entries, trackEntries]);

  const latestWeight = useMemo(() => {
    if (trackEntries.length === 0) return 0;
    const sorted = [...trackEntries].sort((a: any, b: any) => b.date.localeCompare(a.date));
    return parseFloat(sorted[0].weight) || 0;
  }, [trackEntries]);

  const veloGoal = useMemo(() => {
    let goal = 90;
    while (maxVelo >= goal) goal += 5;
    return goal;
  }, [maxVelo]);

  const weightGoal = useMemo(() => {
    let goal = 200;
    while (latestWeight >= goal) goal += 5;
    return goal;
  }, [latestWeight]);

  const modifiers = useMemo(() => {
    return {
      green: entries.filter((e: any) => e.intent_color === 'Green').map((e: any) => parseISO(e.date)),
      yellow: entries.filter((e: any) => e.intent_color === 'Yellow').map((e: any) => parseISO(e.date)),
      red: entries.filter((e: any) => e.intent_color === 'Red').map((e: any) => parseISO(e.date)),
    };
  }, [entries]);

  const modifiersStyles = {
    green: { color: 'white', backgroundColor: '#10b981' },
    yellow: { color: 'black', backgroundColor: '#fbbf24' },
    red: { color: 'white', backgroundColor: '#f87171' },
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 relative pb-12">
      <PKLogo className="absolute -right-4 -top-8 w-32 h-32 text-primary/5 -rotate-12 pointer-events-none" />
      
      <div className="space-y-1">
        <h2 className="text-xl font-black uppercase italic text-primary">Mission Briefing</h2>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Status: In-Season Optimization</p>
      </div>

      {/* Today's Agenda Card */}
      <Card className="bg-primary/5 border border-primary/20 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Activity className="w-16 h-16 -rotate-12" />
        </div>
        <CardContent className="p-5 space-y-4 relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/30"><Target className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-primary/60 tracking-[0.2em] mb-0.5 leading-none">Primary Focus</p>
                <p className="text-lg font-black uppercase italic leading-none">{todayPlan.focus}</p>
              </div>
            </div>
            <div className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-black uppercase text-primary tracking-tighter">
              {todayPlan.type} SESSION
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Throwing', val: todayPlan.throwing, icon: Zap },
              { label: 'Strength', val: todayPlan.lifting, icon: Activity }
            ].map((s, i) => (
              <div key={i} className="p-3 bg-muted/20 rounded-xl border border-border/40 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="w-3 h-3 text-primary/60" />
                  <p className="text-[8px] font-black uppercase text-muted-foreground/70 tracking-widest leading-none">{s.label}</p>
                </div>
                <p className="text-[11px] font-bold line-clamp-2 leading-tight uppercase">{s.val}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progress Trackers Row */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/40 shadow-sm bg-card/40 backdrop-blur-sm p-5 py-4 flex items-center justify-center hover:border-primary/20 transition-colors cursor-pointer group">
          <GoalTracker 
            value={maxVelo} 
            goal={veloGoal} 
            label={`TARGET: ${veloGoal} MPH`} 
            unit="mph" 
            colorClass="stroke-secondary" 
          />
        </Card>
        <Card className="border-border/40 shadow-sm bg-card/40 backdrop-blur-sm p-5 py-4 flex items-center justify-center hover:border-primary/20 transition-colors cursor-pointer group">
          <GoalTracker 
            value={latestWeight} 
            goal={weightGoal} 
            label={`TARGET: ${weightGoal} LBS`} 
            unit="lbs" 
            colorClass="stroke-primary" 
          />
        </Card>
      </div>

      <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-md overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/20">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-[900] uppercase italic tracking-wider">Meso-Cycle Calendar</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => { if (date) { setSelectedDate(date); setIsDialogOpen(true); } }}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="p-0 flex justify-center"
          />
        </CardContent>
      </Card>


      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-xl italic uppercase">
              {format(selectedDate, 'EEEE, MMM dd')}
            </DialogTitle>
          </DialogHeader>
          <DailyEntryForm 
            date={selectedDate} 
            onSuccess={() => setIsDialogOpen(false)} 
            existingEntry={entries.find((e: any) => isSameDay(parseISO(e.date), selectedDate))}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LogTab() {
  const [selectedDate] = useState(new Date());
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ['throwing-entries'],
    queryFn: () => base44.entities.ThrowingEntry.list(),
  });

  const { data: checklistEntries = [] } = useQuery({
    queryKey: ['checklist-entries'],
    queryFn: () => base44.entities.ChecklistEntry.list(),
  });

  const todayEntry = entries.find((e: any) => e.date === dateKey);
  const dayPlan = WEEKLY_PROGRAM[getDay(selectedDate) as keyof typeof WEEKLY_PROGRAM];
  const prescribedType = dayPlan.type;
  const currentIntent = todayEntry?.intent_color || (prescribedType === 'Rest' ? 'Red' : prescribedType) || 'Green';

  const dailyChecklist = useMemo(() => {
    return checklistEntries.find((e: any) => e.date === dateKey)?.items || {};
  }, [checklistEntries, dateKey]);

  const mutation = useMutation({
    mutationFn: (newItems: any) => base44.entities.ChecklistEntry.update({ date: dateKey, items: newItems }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-entries'] });
      toast.success('Log updated');
    },
  });

  const handleToggle = (id: string) => {
    const updatedItems = { ...dailyChecklist, [id]: !dailyChecklist[id] };
    mutation.mutate(updatedItems);
  };

  const renderStepHeader = (num: string, title: string, subtitle: string) => (
    <div className="flex items-center gap-4 mb-6">
      <div className="text-4xl font-black text-primary/10 select-none tracking-tighter">{num}</div>
      <div className="space-y-1">
        <h2 className="text-xl font-[900] uppercase italic text-primary leading-none tracking-tight">{title}</h2>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60 leading-none">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-12 pb-20 relative">
      <PKLogo className="absolute -left-12 top-40 w-56 h-56 text-primary/5 -rotate-45 pointer-events-none" />
      
      {/* Intent Header */}
      <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl border border-primary/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className={cn("h-4 w-4 rounded-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.4)] animate-pulse", 
              currentIntent === 'Green' ? "bg-emerald-500" : 
              currentIntent === 'Yellow' ? "bg-amber-400" : "bg-rose-500"
          )} />
          <div>
            <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1">Active Routine</p>
            <p className="text-sm font-black italic text-primary uppercase leading-none">{dayPlan.focus}</p>
          </div>
        </div>
        <div className="bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
           <p className="text-[9px] font-black uppercase tracking-tighter text-primary whitespace-nowrap">{dayPlan.throwing}</p>
        </div>
      </div>

      {/* STEP 1 */}
      <div className="space-y-4">
        {renderStepHeader("01", "Foundation", "Preparation & Mobility")}
        <div className="grid grid-cols-2 gap-3">
          {["Soft Tissue", "Hydration 20oz", "Core Activation", "Dynamic Warmup"].map((item) => {
             const id = `warmup_${item.replace(/\s+/g, '_').toLowerCase()}`;
             const checked = !!dailyChecklist[id];
             return (
               <button
                key={id}
                onClick={() => handleToggle(id)}
                className={cn(
                  "p-4 rounded-2xl border text-left flex flex-col gap-3 transition-all active:scale-[0.98] group",
                  checked ? "bg-primary/5 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.05)]" : "bg-card/40 border-border/40"
                )}
               >
                 <div className={cn("h-4 w-4 rounded border-2 flex items-center justify-center transition-all", checked ? "bg-primary border-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]" : "border-primary/20 group-hover:border-primary/40")}>
                   {checked && <Check className="w-2.5 h-2.5 text-white stroke-[4]" />}
                 </div>
                 <p className={cn("text-[9px] font-black uppercase tracking-widest", checked ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors")}>{item}</p>
               </button>
             )
          })}
        </div>
      </div>

      {/* STEP 2 */}
      <div className="space-y-6">
        {renderStepHeader("02", "Activation", "J-Bands & Recovery Preparation")}
        <div className="grid grid-cols-1 gap-2.5">
          {ARM_PREP_PROGRAM.map((item, idx) => {
            const id = `arm_prep_${idx}`;
            const checked = !!dailyChecklist[id];
            return (
              <button
                key={id}
                onClick={() => handleToggle(id)}
                className={cn(
                  "p-4 rounded-2xl border flex items-center justify-between transition-all group active:scale-[0.99] relative overflow-hidden",
                  checked ? "bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20" : "bg-card/40 border-border/40 hover:border-primary/20"
                )}
              >
                {checked && <PKLogo className="absolute -right-4 -bottom-4 w-12 h-12 text-white/5 rotate-12" />}
                <div className="flex flex-col text-left relative z-10">
                  <p className="text-xs font-black uppercase italic tracking-wider">{item.name}</p>
                  <p className={cn("text-[10px] font-bold opacity-60", checked ? "text-white" : "text-muted-foreground")}>{item.reps} REPS</p>
                </div>
                <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center border-2 transition-all shadow-sm", checked ? "bg-white border-white" : "border-primary/20 group-hover:border-primary/40")}>
                  {checked && <Check className="w-4 h-4 text-primary stroke-[4]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3 */}
      <div className="space-y-6">
        {renderStepHeader("03", "Engine Room", "Weighted Ball Session")}
        <div className="grid gap-3">
          {WEIGHTED_PROGRAM[currentIntent as keyof typeof WEIGHTED_PROGRAM]?.map((item, idx) => {
            const id = `weighted_${idx}`;
            const checked = !!dailyChecklist[id];
            return (
              <button
                key={id}
                onClick={() => handleToggle(id)}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all active:scale-[0.99] group relative",
                  checked ? "bg-primary border-primary text-primary-foreground shadow-2xl shadow-primary/30" : "bg-card border-border/40 hover:border-primary/30"
                )}
              >
                <div className="flex flex-col gap-2 relative z-10">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-[900] uppercase italic tracking-tight">{item.drill || item.ball}</p>
                    <div className={cn("h-6 w-6 rounded-lg shrink-0 flex items-center justify-center border-2 transition-all", checked ? "bg-white border-white" : "border-primary/10 group-hover:border-primary/30")}>
                      {checked && <Check className="w-4 h-4 text-primary stroke-[4]" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={cn("text-[10px] font-black uppercase tracking-wider tabular-nums", checked ? "text-white/80" : "text-primary")}>{item.ball}</p>
                    <span className="opacity-20">•</span>
                    <p className={cn("text-[10px] font-bold", checked ? "text-white/70" : "text-muted-foreground")}>{item.reps} REPS</p>
                  </div>
                  <div className={cn("inline-block mt-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors", 
                    checked ? "bg-white/10 border-white/20 text-white" : "bg-primary/5 border-primary/20 text-primary")}>
                    FOCUS: {item.focus}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 4 */}
      <div className="space-y-6">
        {renderStepHeader("04", "Recovery", "Post-Session Logistics")}
        <div className="grid gap-3">
          {[
            "P-K Recovery Protocol",
            "Reverse Throws (2lb Ball)",
            "Soft Tissue (Manual)",
            "Hydration Refill"
          ].map((item, idx) => {
            const id = `recovery_${idx}`;
            const checked = !!dailyChecklist[id];
            return (
              <button
                key={id}
                onClick={() => handleToggle(id)}
                className={cn(
                  "p-4 rounded-2xl border flex items-center justify-between transition-all group active:scale-[0.99]",
                  checked ? "bg-primary/5 border-primary" : "bg-card/40 border-border/40 hover:border-primary/20"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs transition-colors", checked ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground group-hover:text-primary")}>
                    {idx + 1}
                  </div>
                  <p className={cn("text-xs font-[900] uppercase tracking-wider transition-colors", checked ? "text-primary" : "text-muted-foreground")}>{item}</p>
                </div>
                <div className={cn("h-5 w-5 rounded-full flex items-center justify-center border-2 transition-all", checked ? "bg-primary border-primary" : "border-border/60 group-hover:border-primary/40")}>
                   {checked && <Check className="w-3 h-3 text-white stroke-[4]" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}

function MechanicsTab() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) { // 15MB limit for inline base64
        toast.error("Video too large. Please use a clip under 15MB for analysis.");
        return;
      }
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
    }
  };

  const analyzeMechanics = async () => {
    if (!videoFile) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                {
                  text: "You are a world-class high-performance pitching and throwing mechanics coach. Analyze this video clip of an athlete. Focus on: 1. 3X (Triple Extension) timing, 2. Glove-side stability and tuck, 3. Front-foot plant rhythm and bracing, 4. Upper-body rotation and separation (hip-shoulder separation), 5. Arm path efficiency and deceleration. Provide a technical critique in a structured format: ### Deep Analysis (Summary of current mechanics), ### Critical Fixes (Top 3 things to change), ### Recommended Drills (Specific exercises to address fixes). Keep the tone intense, highly technical, and professional."
                },
                {
                  inlineData: {
                    mimeType: videoFile.type,
                    data: base64Data
                  }
                }
              ]
            }
          ]
        });

        if (response.text) {
          setAnalysisResult(response.text);
        } else {
          toast.error("Analysis failed. No mechanical insights found.");
        }
      } catch (error) {
        console.error("AI Analysis error:", error);
        toast.error("Critical System Error: Performance Lab AI is offline.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(videoFile);
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 pb-20">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Dna className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-black uppercase italic text-primary tracking-tight">Mechanics Lab</h2>
        </div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">AI Biomechanical Analysis Engine</p>
      </div>

      {!videoFile ? (
        <div className="relative group">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-3xl p-12 flex flex-col items-center justify-center gap-6 transition-all group-hover:border-primary/40 group-hover:bg-primary/10">
             <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center ring-8 ring-primary/5">
                <FileVideo className="w-10 h-10 text-primary" />
             </div>
             <div className="text-center">
                <p className="text-sm font-black uppercase italic tracking-wider mb-2">Import Target Video</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">MP4 / MOV / AVI (MAX 15MB)</p>
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">AI Mechanics Scan Enabled</span>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/20 bg-black/40 backdrop-blur-md">
            <div className="aspect-video bg-black flex items-center justify-center relative">
               {videoPreviewUrl && <video src={videoPreviewUrl} className="w-full h-full object-contain" controls />}
               <Button 
                variant="destructive" 
                size="icon" 
                onClick={() => {setVideoFile(null); setVideoPreviewUrl(null); setAnalysisResult(null);}}
                className="absolute top-4 right-4 rounded-full h-8 w-8"
               >
                 <X className="w-4 h-4" />
               </Button>
            </div>
            {!analysisResult && !isAnalyzing && (
              <div className="p-6">
                <Button 
                  onClick={analyzeMechanics} 
                  className="w-full h-14 rounded-2xl text-lg font-black uppercase italic tracking-widest gap-3"
                  disabled={isAnalyzing}
                >
                  <Activity className="w-5 h-5" /> Start AI Analysis
                </Button>
              </div>
            )}
          </Card>

          {isAnalyzing && (
            <Card className="p-12 flex flex-col items-center justify-center gap-6 border-primary/20 bg-primary/5">
               <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="relative"
               >
                  <div className="absolute inset-0 blur-xl bg-primary opacity-20 rounded-full scale-110" />
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
               </motion.div>
               <div className="text-center space-y-2">
                 <p className="text-sm font-black uppercase italic tracking-widest animate-pulse">Calculating Kinematic Sequence...</p>
                 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Scanning joint angles and ground force timing</p>
               </div>
            </Card>
          )}

          {analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-black uppercase italic tracking-wider text-primary">Lab Results</h3>
                </div>
                <div className="flex items-center gap-1">
                   <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                   <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 opacity-80">Sync Complete</p>
                </div>
              </div>

              <Card className="border-border/40 bg-card/60 backdrop-blur-md overflow-hidden">
                <CardContent className="p-6">
                  <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-h3:text-primary prose-h3:font-black prose-h3:uppercase prose-h3:italic prose-h3:tracking-tighter prose-h3:mt-8 first:prose-h3:mt-0 font-mono text-[11px] text-muted-foreground/90 whitespace-pre-wrap">
                    {analysisResult}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                 <Button variant="outline" onClick={() => {setVideoFile(null); setAnalysisResult(null);}} className="h-12 border-primary/20 hover:bg-primary/5 rounded-xl font-black uppercase tracking-widest text-[9px]">
                   New Analysis
                 </Button>
                 <Button className="h-12 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20">
                   Export Data
                 </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Lab Grid Layout Decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
    </div>
  );
}

function TrackTab() {
  const [selectedDate] = useState(new Date());
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const { data: trackEntries = [] } = useQuery({
    queryKey: ['track-entries'],
    queryFn: () => base44.entities.TrackEntry.list(),
  });

  const todayStats = useMemo(() => {
    return trackEntries.find((e: any) => e.date === dateKey) || { weight: '', velocity: '' };
  }, [trackEntries, dateKey]);

  const mutation = useMutation({
    mutationFn: (newStats: any) => base44.entities.TrackEntry.update({ date: dateKey, ...newStats }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-entries'] });
      toast.success('Stats updated');
    },
  });

  const handleUpdate = (field: string, value: string) => {
    mutation.mutate({ ...todayStats, [field]: value });
  };

  const chartData = useMemo(() => {
    return [...trackEntries]
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .map((e: any) => ({
        date: format(parseISO(e.date), 'MM/dd'),
        weight: parseFloat(e.weight) || null,
        velocity: parseFloat(e.velocity) || null,
      }))
      .slice(-14);
  }, [trackEntries]);

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8 pb-10 relative">
      <PKLogo className="absolute -left-10 top-20 w-48 h-48 text-primary/5 rotate-45 pointer-events-none" />
      
      <div className="space-y-1">
        <h2 className="text-xl font-[900] uppercase italic text-primary leading-none tracking-tight">Biometric Surveillance</h2>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Session Analytics & Physical Readiness</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card/40 border-border/40 shadow-sm transition-all focus-within:border-primary/40 focus-within:bg-card">
          <CardContent className="p-5 space-y-3">
            <Label className="text-[9px] font-black uppercase text-muted-foreground/80 tracking-widest flex items-center gap-2">
              <Activity className="w-3 h-3 text-primary" /> Body Weight
            </Label>
            <div className="relative">
              <Input 
                type="number" 
                step="0.1" 
                defaultValue={todayStats.weight}
                onBlur={(e) => handleUpdate('weight', e.target.value)}
                placeholder="--.-" 
                className="text-2xl h-14 font-[900] border-none bg-primary/5 focus-visible:ring-primary font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/40 uppercase">lbs</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-border/40 shadow-sm transition-all focus-within:border-primary/40 focus-within:bg-card">
          <CardContent className="p-5 space-y-3">
            <Label className="text-[9px] font-black uppercase text-muted-foreground/80 tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3 text-secondary" /> Peak Velocity
            </Label>
            <div className="relative">
              <Input 
                type="number" 
                step="0.1" 
                defaultValue={todayStats.velocity}
                onBlur={(e) => handleUpdate('velocity', e.target.value)}
                placeholder="--.-" 
                className="text-2xl h-14 font-[900] border-none bg-primary/5 focus-visible:ring-primary font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-secondary/40 uppercase">mph</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="bg-card/30 border-border/40 overflow-hidden backdrop-blur-sm relative">
          <CardHeader className="pb-0 pt-5 px-6">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/20"><TrendingUp className="w-3.5 h-3.5 text-primary" /></div>
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Mass Evolution (14-Day)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-44 pt-6 pb-2 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" fontSize={8} tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontWeight: 900 }} />
                <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', fontSize: '10px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 900, textTransform: 'uppercase' }}
                  cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line type="stepAfter" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls animationDuration={1500} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-border/40 overflow-hidden backdrop-blur-sm relative">
          <CardHeader className="pb-0 pt-5 px-6">
            <div className="flex items-center gap-2">
              <div className="bg-secondary/10 p-1.5 rounded-lg border border-secondary/20"><Zap className="w-3.5 h-3.5 text-secondary" /></div>
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-secondary">Velocity Matrix (14-Day)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-44 pt-6 pb-2 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" fontSize={8} tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontWeight: 900 }} />
                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', fontSize: '10px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: 'hsl(var(--secondary))', fontWeight: 900, textTransform: 'uppercase' }}
                  cursor={{ stroke: 'hsl(var(--secondary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line type="monotone" dataKey="velocity" stroke="hsl(var(--secondary))" strokeWidth={4} dot={{ r: 4, fill: 'hsl(var(--secondary))', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls animationDuration={1500} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NutritionTab() {
  const [selectedDate] = useState(new Date());
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const { data: mealEntries = [] } = useQuery({
    queryKey: ['meal-entries'],
    queryFn: () => base44.entities.MealEntry.list(),
  });

  const dailyMeals = useMemo(() => {
    return mealEntries.find((e: any) => e.date === dateKey)?.meals || {};
  }, [mealEntries, dateKey]);

  const mutation = useMutation({
    mutationFn: (newMeals: any) => base44.entities.MealEntry.update({ date: dateKey, meals: newMeals }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-entries'] });
      toast.success('Fueling station updated');
    },
  });

  const handleMealChange = (time: string, value: string) => {
    const updatedMeals = { ...dailyMeals, [time]: value };
    mutation.mutate(updatedMeals);
  };

  const loggedMealsCount = Object.values(dailyMeals).filter(v => !!v).length;
  const mealProgress = (loggedMealsCount / MEAL_PLAN.length) * 100;

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8 relative overflow-hidden pb-12">
      <PKLogo className="absolute -right-8 -bottom-8 w-40 h-40 text-secondary/5 rotate-12 pointer-events-none" />
      
      <div className="space-y-1 px-1">
        <h2 className="text-xl font-[900] uppercase italic text-primary leading-none tracking-tight">Fuel Optimization</h2>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Status: Anabolic State</p>
      </div>

      {/* Daily Macros Targets */}
      <Card className="border-border/40 shadow-sm bg-card/40 backdrop-blur-md overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-5">
           <Zap className="w-16 h-16" />
        </div>
        <CardHeader className="pb-6 pt-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/20"><Flame className="w-4 h-4 text-primary" /></div>
              <CardTitle className="text-sm font-[900] uppercase italic tracking-wider">Critical Macros</CardTitle>
            </div>
            <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40">{format(selectedDate, 'MMM dd')}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 relative z-10">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                <Droplets className="w-3.5 h-3.5 text-blue-500"/> Hydration Efficiency
              </span>
              <span className="text-xs font-black tabular-nums">128 <span className="opacity-40">OZ</span></span>
            </div>
            <Progress value={75} className="h-1.5 bg-blue-500/10" indicatorClassName="bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                <Trophy className="w-3.5 h-3.5 text-orange-500"/> Nitrogen Support (Pro)
              </span>
              <span className="text-xs font-black tabular-nums">200 <span className="opacity-40">G</span></span>
            </div>
            <Progress value={mealProgress} className="h-1.5 bg-orange-500/10" indicatorClassName="bg-orange-500 shadow-[0_0_8px_#f97316]" />
          </div>

          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 backdrop-blur-sm flex items-start gap-3">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-[10px] font-bold text-primary/80 leading-relaxed uppercase tracking-tight italic">
              "Hypertrophy phase requires consistent spacing. Aim for 35g protein every 3 hours to maximize MPS."
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Editable Meal Schedule */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <div className="h-1 w-4 bg-primary rounded-full" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Fuelling Protocol</h3>
          </div>
          <span className="text-[8px] font-black text-primary uppercase opacity-60">Verified {loggedMealsCount}/{MEAL_PLAN.length}</span>
        </div>
        <div className="grid gap-3">
          {MEAL_PLAN.map((meal, idx) => {
            const loggedFood = dailyMeals[meal.time];
            const isCompleted = !!loggedFood;
            return (
              <div key={idx} className="group relative">
                <div className={cn(
                  "flex gap-5 p-4 rounded-2xl border transition-all duration-300 items-center overflow-hidden",
                  isCompleted 
                    ? "bg-primary/5 border-primary shadow-sm" 
                    : "bg-card/40 border-border/40 hover:border-primary/20 hover:bg-card focus-within:border-primary focus-within:bg-card"
                )}>
                  {isCompleted && (
                    <div className="absolute -left-1 top-0 bottom-0 w-1.5 bg-primary" />
                  )}
                  <div className="flex flex-col shrink-0 w-14">
                    <span className={cn("text-[10px] font-black transition-colors uppercase tracking-tight", isCompleted ? "text-primary" : "text-muted-foreground/60")}>{meal.time}</span>
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder={meal.item}
                      defaultValue={loggedFood || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (loggedFood || "")) {
                          handleMealChange(meal.time, e.target.value);
                        }
                      }}
                      className={cn(
                        "bg-transparent border-none p-0 m-0 w-full text-xs font-[900] uppercase tracking-tight focus:ring-0 placeholder:text-muted-foreground/20 placeholder:italic transition-colors",
                        isCompleted ? "text-foreground" : "text-muted-foreground/70"
                      )}
                    />
                  </div>
                  <div className={cn(
                    "h-6 w-6 rounded-lg flex items-center justify-center border-2 transition-all",
                    isCompleted ? "bg-primary border-primary" : "border-border/30"
                  )}>
                    {isCompleted && <Check className="w-4 h-4 text-white stroke-[4]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function DailyEntryForm({ date, onSuccess, existingEntry }: { date: Date, onSuccess: () => void, existingEntry?: any }) {
  const queryClient = useQueryClient();
  const dayOfWeek = getDay(date) as keyof typeof WEEKLY_PROGRAM;
  const plan = WEEKLY_PROGRAM[dayOfWeek];
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState(existingEntry || {
    date: format(date, 'yyyy-MM-dd'),
    intent_color: plan.type === 'Rest' ? 'Red' : plan.type,
    peak_5oz_velo: '',
    warmup_check: false,
    lift_check: false,
    rpe: 5,
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => base44.entities.ThrowingEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['throwing-entries'] });
      setSaved(true);
      toast.success('Training log saved!');
      setTimeout(() => { setSaved(false); onSuccess(); }, 1000);
    },
    onError: () => {
      toast.error('Failed to save log.');
    }
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6 pt-2">
      
      {/* Today's Prescribed Plan */}
      <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Brain className="w-4 h-4" />
          <h4 className="text-xs font-black uppercase tracking-widest">Today's Program Focus</h4>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold">{plan.focus}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-background rounded border text-[10px]">
              <p className="font-bold uppercase text-muted-foreground mb-1 underline">Throwing</p>
              {plan.throwing}
            </div>
            <div className="p-2 bg-background rounded border text-[10px]">
              <p className="font-bold uppercase text-muted-foreground mb-1 underline">Strength</p>
              {plan.lifting}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-xs font-bold uppercase text-muted-foreground">Log Your Session</Label>
        
        <Select value={form.intent_color} onValueChange={(v) => setForm({...form, intent_color: v})}>
          <SelectTrigger className="h-12 font-bold"><SelectValue placeholder="Intent Color" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Green">Green — Max Intent (Velo)</SelectItem>
            <SelectItem value="Yellow">Yellow — Hybrid / Med Ball</SelectItem>
            <SelectItem value="Red">Red — Recovery / Flush</SelectItem>
          </SelectContent>
        </Select>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase flex items-center gap-2"><Zap className="w-3 h-3 text-primary"/> Peak Velo (MPH)</Label>
            <Input type="number" step="0.1" value={form.peak_5oz_velo} onChange={(e) => setForm({...form, peak_5oz_velo: e.target.value})} className="h-12 text-lg font-black" placeholder="00.0" />
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-xl">
           <Checkbox checked={form.warmup_check} onCheckedChange={(c) => setForm({...form, warmup_check: !!c})} />
           <Label className="text-xs font-bold uppercase">Warmup & Arm Care Completed</Label>
        </div>
        <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-xl">
           <Checkbox checked={form.lift_check} onCheckedChange={(c) => setForm({...form, lift_check: !!c})} />
           <Label className="text-xs font-bold uppercase">Lifting / Mobility Completed</Label>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-black uppercase">
            <span>Perceived Effort (RPE)</span>
            <span className="text-primary">{form.rpe}/10</span>
          </div>
          <Slider value={[form.rpe]} min={1} max={10} step={1} onValueChange={(vals) => setForm({...form, rpe: Array.isArray(vals) ? vals[0] : vals})} />
        </div>

        <Textarea 
          placeholder="Notes on 3X Mechanics, arm feel, or cues..." 
          value={form.notes} 
          onChange={(e) => setForm({...form, notes: e.target.value})}
          className="bg-muted/10 min-h-[100px]"
        />
      </div>

      <Button type="submit" disabled={mutation.isPending || saved} className="w-full h-14 rounded-xl text-md font-black uppercase italic tracking-widest shadow-lg shadow-primary/20">
        {saved ? 'Session Logged' : 'Save Training Log'}
      </Button>
    </form>
  );
}
