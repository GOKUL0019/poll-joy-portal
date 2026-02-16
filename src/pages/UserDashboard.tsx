import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, Clock, CheckCircle2, LogOut, PartyPopper } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PollOption {
  id: string;
  option_text: string;
  sort_order: number;
}

interface Poll {
  id: string;
  question: string;
  start_time: string;
  end_time: string;
  poll_date: string;
}

const UserDashboard = () => {
  const { user, signOut } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isWithinWindow, setIsWithinWindow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeMessage, setTimeMessage] = useState("");

  useEffect(() => {
    loadTodaysPoll();
  }, [user]);

  const checkTimeWindow = (startTime: string, endTime: string) => {
    const now = new Date();
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (currentMinutes < startMinutes) {
      const diff = startMinutes - currentMinutes;
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      setTimeMessage(
        `The poll opens in ${hours > 0 ? `${hours}h ` : ""}${mins}m. Come back at ${startTime.slice(0, 5)}.`
      );
      return false;
    }
    if (currentMinutes >= endMinutes) {
      setTimeMessage("Today's poll has closed. See you tomorrow!");
      return false;
    }
    return true;
  };

  const loadTodaysPoll = async () => {
    if (!user) return;
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    const { data: pollData } = await supabase
      .from("polls")
      .select("*")
      .eq("poll_date", today)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!pollData) {
      setLoading(false);
      setTimeMessage("No poll available today. Check back later!");
      return;
    }

    setPoll(pollData);
    const withinWindow = checkTimeWindow(pollData.start_time, pollData.end_time);
    setIsWithinWindow(withinWindow);

    const { data: optionsData } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", pollData.id)
      .order("sort_order");

    setOptions(optionsData || []);

    // Check if already voted
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollData.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVote) setHasVoted(true);
    setLoading(false);
  };

  const handleVote = async () => {
    if (!selectedOption || !poll || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("votes").insert({
      poll_id: poll.id,
      option_id: selectedOption,
      user_id: user.id,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already voted", description: "You've already cast your vote today.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      setHasVoted(true);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
              <Vote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Daily Poll</h2>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {hasVoted ? (
            <motion.div
              key="thankyou"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-6"
              >
                <PartyPopper className="w-10 h-10 text-success" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-bold mb-3"
              >
                Thank You!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-muted-foreground text-lg"
              >
                Your vote has been recorded successfully.
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-4 inline-flex items-center gap-2 text-success text-sm font-medium"
              >
                <CheckCircle2 className="w-4 h-4" />
                Response confirmed
              </motion.div>
            </motion.div>
          ) : !poll || !isWithinWindow ? (
            <motion.div
              key="closed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Poll Unavailable</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {timeMessage}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="poll"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-2xl leading-relaxed">
                    {poll.question}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select one option and submit your vote
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {options.map((option, i) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => setSelectedOption(option.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedOption === option.id
                          ? "border-primary bg-primary/5 shadow-soft"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedOption === option.id
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {selectedOption === option.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-primary-foreground"
                            />
                          )}
                        </div>
                        <span className="font-medium">{option.option_text}</span>
                      </div>
                    </motion.button>
                  ))}
                  <Button
                    onClick={handleVote}
                    disabled={!selectedOption || submitting}
                    className="w-full mt-4 gradient-primary text-primary-foreground hover:opacity-90"
                    size="lg"
                  >
                    {submitting ? "Submitting..." : "Cast Your Vote"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default UserDashboard;
