import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BarChart3, Users, UserCheck, UserX } from "lucide-react";
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
  voter_email: string;
  option_text: string;
  voted_at: string;
  gender: string;
  hostel: string | null;
}

interface NotVotedUser {
  full_name: string | null;
  email: string;
  gender: string;
  hostel: string | null;
}

const PollResults = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState("");
  const [results, setResults] = useState<OptionResult[]>([]);
  const [voteDetails, setVoteDetails] = useState<VoteDetail[]>([]);
  const [notVotedUsers, setNotVotedUsers] = useState<NotVotedUser[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);

  const [boysYes, setBoysYes] = useState(0);
  const [kaveriYes, setKaveriYes] = useState(0);
  const [amaravathiYes, setAmaravathiYes] = useState(0);

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
      .select("user_id, full_name, email, gender, hostel");

    const { data: authUsers } = await supabase
      .from("authorized_emails")
      .select("email, full_name, gender, hostel");

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

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

      const optionMap = new Map(options.map((o) => [o.id, o.option_text]));

      const details: VoteDetail[] = votes.map((v) => {
        const profile = profileMap.get(v.user_id);
        return {
          voter_name: profile?.full_name || profile?.email || "Unknown",
          voter_email: profile?.email || "",
          option_text: optionMap.get(v.option_id) || "Unknown",
          voted_at: new Date(v.voted_at).toLocaleString(),
          gender: profile?.gender || "—",
          hostel: profile?.hostel || "—",
        };
      });

      setVoteDetails(details);

      // ✅ YES COUNTS
      const boysYesCount = details.filter(
        (d) =>
          d.gender.toLowerCase() === "male" &&
          d.option_text.toLowerCase() === "yes"
      ).length;

      const kaveriYesCount = details.filter(
        (d) =>
          d.gender.toLowerCase() === "female" &&
          d.hostel?.toLowerCase() === "kaveri" &&
          d.option_text.toLowerCase() === "yes"
      ).length;

      const amaravathiYesCount = details.filter(
        (d) =>
          d.gender.toLowerCase() === "female" &&
          d.hostel?.toLowerCase() === "amaravathi" &&
          d.option_text.toLowerCase() === "yes"
      ).length;

      setBoysYes(boysYesCount);
      setKaveriYes(kaveriYesCount);
      setAmaravathiYes(amaravathiYesCount);

      // NOT VOTED USERS
      const votedEmails = new Set(details.map((d) => d.voter_email));
      const notVoted = (authUsers || []).filter(
        (u) => !votedEmails.has(u.email)
      );
      setNotVotedUsers(notVoted);
    }
  };

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
    downloadExcel(notVotedUsers, "not_voted_users.xlsx");
  };

  const colors = [
    "hsl(222,60%,22%)",
    "hsl(40,90%,56%)",
    "hsl(152,60%,40%)",
    "hsl(0,72%,51%)",
  ];

  return (
    <div className="space-y-6">

      {/* ✅ YES SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card border-0">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{boysYes}</p>
            <p className="text-sm text-muted-foreground">Boys </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-accent">{kaveriYes}</p>
            <p className="text-sm text-muted-foreground">Kaveri Girls </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-accent">{amaravathiYes}</p>
            <p className="text-sm text-muted-foreground">Amaravathi Girls </p>
          </CardContent>
        </Card>
      </div>

      {/* Poll Results */}
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
              const pct = totalVotes
                ? Math.round((r.count / totalVotes) * 100)
                : 0;
              return (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{r.option_text}</span>
                    <span>
                      {r.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: colors[i % colors.length],
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Voted Table */}
      <Card className="shadow-card border-0">
        <CardHeader className="flex justify-between">
          <CardTitle>Voted ({voteDetails.length})</CardTitle>
          <Button size="sm" onClick={downloadVoted}>Download</Button>
        </CardHeader>
      </Card>

      {/* Not Voted Table */}
      <Card className="shadow-card border-0">
        <CardHeader className="flex justify-between">
          <CardTitle>Not Voted ({notVotedUsers.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={downloadNotVoted}>Download</Button>
        </CardHeader>
      </Card>

    </div>
  );
};

export default PollResults;