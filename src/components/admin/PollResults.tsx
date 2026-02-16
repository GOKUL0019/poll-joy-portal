import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { BarChart3, Users } from "lucide-react";

interface Poll {
  id: string;
  question: string;
  poll_date: string;
}

interface OptionResult {
  id: string;
  option_text: string;
  count: number;
}

interface VoteDetail {
  voter_email: string;
  option_text: string;
  voted_at: string;
}

const PollResults = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<string>("");
  const [results, setResults] = useState<OptionResult[]>([]);
  const [voteDetails, setVoteDetails] = useState<VoteDetail[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    loadPolls();
  }, []);

  useEffect(() => {
    if (selectedPoll) loadResults(selectedPoll);
  }, [selectedPoll]);

  const loadPolls = async () => {
    const { data } = await supabase
      .from("polls")
      .select("id, question, poll_date")
      .order("poll_date", { ascending: false });
    setPolls(data || []);
    if (data && data.length > 0) setSelectedPoll(data[0].id);
  };

  const loadResults = async (pollId: string) => {
    // Load options
    const { data: options } = await supabase
      .from("poll_options")
      .select("id, option_text")
      .eq("poll_id", pollId)
      .order("sort_order");

    // Load votes
    const { data: votes } = await supabase
      .from("votes")
      .select("option_id, user_id, voted_at")
      .eq("poll_id", pollId);

    // Load profiles for voter emails
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name");

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    if (options && votes) {
      const countMap = new Map<string, number>();
      votes.forEach((v) => countMap.set(v.option_id, (countMap.get(v.option_id) || 0) + 1));

      const res: OptionResult[] = options.map((o) => ({
        id: o.id,
        option_text: o.option_text,
        count: countMap.get(o.id) || 0,
      }));
      setResults(res);
      setTotalVotes(votes.length);

      // Build vote details
      const optionMap = new Map(options.map((o) => [o.id, o.option_text]));
      const details: VoteDetail[] = votes.map((v) => ({
        voter_email: profileMap.get(v.user_id)?.email || "Unknown",
        option_text: optionMap.get(v.option_id) || "Unknown",
        voted_at: new Date(v.voted_at).toLocaleString(),
      }));
      setVoteDetails(details);
    }
  };

  const maxCount = Math.max(...results.map((r) => r.count), 1);

  const colors = [
    "hsl(222, 60%, 22%)",
    "hsl(40, 90%, 56%)",
    "hsl(152, 60%, 40%)",
    "hsl(0, 72%, 51%)",
    "hsl(270, 50%, 50%)",
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-0">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              Poll Results
            </CardTitle>
            <Select value={selectedPoll} onValueChange={setSelectedPoll}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select poll" />
              </SelectTrigger>
              <SelectContent>
                {polls.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.poll_date}: {p.question.slice(0, 40)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No results available.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{totalVotes} total vote{totalVotes !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-4">
                {results.map((r, i) => {
                  const pct = totalVotes > 0 ? Math.round((r.count / totalVotes) * 100) : 0;
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="space-y-1"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{r.option_text}</span>
                        <span className="text-muted-foreground">
                          {r.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.1 + 0.3, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ background: colors[i % colors.length] }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {voteDetails.length > 0 && (
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Vote Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voter</TableHead>
                    <TableHead>Choice</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {voteDetails.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{v.voter_email}</TableCell>
                      <TableCell>{v.option_text}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{v.voted_at}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PollResults;
