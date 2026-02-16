import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, X, Vote } from "lucide-react";
import { motion } from "framer-motion";

interface Poll {
  id: string;
  question: string;
  poll_date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const ManagePolls = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [question, setQuestion] = useState("");
  const [pollDate, setPollDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("19:00");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    const { data } = await supabase
      .from("polls")
      .select("*")
      .order("poll_date", { ascending: false })
      .limit(20);
    setPolls(data || []);
  };

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };
  const updateOption = (i: number, val: string) => {
    const updated = [...options];
    updated[i] = val;
    setOptions(updated);
  };

  const createPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim());
    if (!question.trim() || validOptions.length < 2) {
      toast({ title: "Error", description: "Question and at least 2 options required.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data: poll, error } = await supabase
      .from("polls")
      .insert({
        question: question.trim(),
        poll_date: pollDate,
        start_time: startTime + ":00",
        end_time: endTime + ":00",
        created_by: user?.id,
      })
      .select()
      .single();

    if (error || !poll) {
      toast({ title: "Error", description: error?.message || "Failed to create poll", variant: "destructive" });
      setLoading(false);
      return;
    }

    const optionsToInsert = validOptions.map((text, i) => ({
      poll_id: poll.id,
      option_text: text.trim(),
      sort_order: i,
    }));

    const { error: optError } = await supabase.from("poll_options").insert(optionsToInsert);
    if (optError) {
      toast({ title: "Error", description: optError.message, variant: "destructive" });
    } else {
      toast({ title: "Poll created!", description: `Poll for ${pollDate} is ready.` });
      setQuestion("");
      setOptions(["", ""]);
      loadPolls();
    }
    setLoading(false);
  };

  const togglePoll = async (id: string, current: boolean) => {
    await supabase.from("polls").update({ is_active: !current }).eq("id", id);
    loadPolls();
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Vote className="w-5 h-5 text-accent" />
            Create New Poll
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createPoll} className="space-y-4">
            <div className="space-y-1">
              <Label>Question</Label>
              <Input
                placeholder="What's your question?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={pollDate} onChange={(e) => setPollDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                  {options.length > 2 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="w-4 h-4 mr-1" /> Add Option
              </Button>
            </div>
            <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground hover:opacity-90">
              {loading ? "Creating..." : "Create Poll"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg">Recent Polls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {polls.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No polls created yet.</p>
          ) : (
            polls.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl border bg-card"
              >
                <div>
                  <p className="font-medium">{p.question}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.poll_date} · {p.start_time.slice(0, 5)} – {p.end_time.slice(0, 5)}
                  </p>
                </div>
                <Switch checked={p.is_active} onCheckedChange={() => togglePoll(p.id, p.is_active)} />
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagePolls;
