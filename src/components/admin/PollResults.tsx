import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BarChart3, Users } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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
  voter_name: string;
  option_text: string;
  voted_at: string;
}

const PollResults = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState("");
  const [results, setResults] = useState<OptionResult[]>([]);
  const [voteDetails, setVoteDetails] = useState<VoteDetail[]>([]);
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([]);
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
    const { data: options } = await supabase
      .from("poll_options")
      .select("id, option_text")
      .eq("poll_id", pollId);

    const { data: votes } = await supabase
      .from("votes")
      .select("option_id, user_id, voted_at")
      .eq("poll_id", pollId);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email");

    const { data: authUsers } = await supabase
      .from("authorized_emails")
      .select("email, full_name");

    setAuthorizedUsers(authUsers || []);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p])
    );

    if (options && votes) {
      const countMap = new Map<string, number>();
      votes.forEach((v) =>
        countMap.set(v.option_id, (countMap.get(v.option_id) || 0) + 1)
      );

      setResults(
        options.map((o) => ({
          id: o.id,
          option_text: o.option_text,
          count: countMap.get(o.id) || 0,
        }))
      );

      setTotalVotes(votes.length);

      const optionMap = new Map(options.map(o => [o.id, o.option_text]));

      const details: VoteDetail[] = votes.map((v) => ({
        voter_name:
          profileMap.get(v.user_id)?.full_name ||
          profileMap.get(v.user_id)?.email ||
          "Unknown",
        option_text: optionMap.get(v.option_id) || "Unknown",
        voted_at: new Date(v.voted_at).toLocaleString(),
      }));

      setVoteDetails(details);
    }
  };

  // 📥 Excel download helper
  const downloadExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, fileName);
  };

  const downloadVoted = () => {
    downloadExcel(voteDetails, "voted_users.xlsx");
  };

  const downloadNotVoted = () => {
    const votedNames = new Set(voteDetails.map(v => v.voter_name));

    const notVoted = authorizedUsers.filter(
      (u) => !votedNames.has(u.full_name)
    );

    downloadExcel(notVoted, "not_voted_users.xlsx");
  };

  const colors = [
    "hsl(222,60%,22%)",
    "hsl(40,90%,56%)",
    "hsl(152,60%,40%)",
    "hsl(0,72%,51%)",
    "hsl(270,50%,50%)",
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-0">
        <CardHeader>
          <div className="flex justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
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
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            {totalVotes} total votes
          </div>

          <div className="space-y-4">
            {results.map((r, i) => {
              const pct = totalVotes ? Math.round((r.count / totalVotes) * 100) : 0;
              return (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{r.option_text}</span>
                    <span>{r.count} ({pct}%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {voteDetails.length > 0 && (
        <Card className="shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Vote Details</CardTitle>

            <div className="flex gap-2">
              <Button onClick={downloadVoted}>Download Voted</Button>
              <Button variant="outline" onClick={downloadNotVoted}>
                Download Not Voted
              </Button>
            </div>
          </CardHeader>

          <CardContent>
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
                    <TableCell className="font-medium">{v.voter_name}</TableCell>
                    <TableCell>{v.option_text}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.voted_at}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PollResults;
