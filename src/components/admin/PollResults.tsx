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
  const [votedCounts, setVotedCounts] = useState({ boys: 0, girls: 0 });
  const [notVotedCounts, setNotVotedCounts] = useState({ boys: 0, girls: 0 });

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

      const optionMap = new Map(options.map((o) => [o.id, o.option_text]));

      const details: VoteDetail[] = votes.map((v) => {
        const profile = profileMap.get(v.user_id);
        return {
          voter_name: profile?.full_name || profile?.email || "Unknown",
          voter_email: profile?.email || "",
          option_text: optionMap.get(v.option_id) || "Unknown",
          voted_at: new Date(v.voted_at).toLocaleString(),
          gender: profile?.gender || "—",
          hostel: profile?.gender === "female" ? profile?.hostel || "—" : "—",
        };
      });

      setVoteDetails(details);

      // Count voted boys/girls
      setVotedCounts({
        boys: details.filter((d) => d.gender === "male").length,
        girls: details.filter((d) => d.gender === "female").length,
      });

      // Determine not-voted users
      const votedEmails = new Set(details.map((d) => d.voter_email));
      const notVoted = (authUsers || []).filter((u) => !votedEmails.has(u.email));
      setNotVotedUsers(notVoted);
      setNotVotedCounts({
        boys: notVoted.filter((u) => u.gender === "male").length,
        girls: notVoted.filter((u) => u.gender === "female").length,
      });
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
    downloadExcel(voteDetails.map(({ voter_name, voter_email, gender, hostel, option_text, voted_at }) => ({
      Name: voter_name, Email: voter_email, Gender: gender, Hostel: hostel, Choice: option_text, "Voted At": voted_at
    })), "voted_users.xlsx");
  };

  const downloadNotVoted = () => {
    downloadExcel(notVotedUsers.map((u) => ({
      Name: u.full_name || "—", Email: u.email, Gender: u.gender, Hostel: u.gender === "female" ? u.hostel || "—" : "—"
    })), "not_voted_users.xlsx");
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
      {/* Summary counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card border-0">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{votedCounts.boys}</p>
            <p className="text-sm text-muted-foreground">Boys Voted</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-accent">{votedCounts.girls}</p>
            <p className="text-sm text-muted-foreground">Girls Voted</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-muted-foreground">{notVotedCounts.boys}</p>
            <p className="text-sm text-muted-foreground">Boys Not Voted</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-muted-foreground">{notVotedCounts.girls}</p>
            <p className="text-sm text-muted-foreground">Girls Not Voted</p>
          </CardContent>
        </Card>
      </div>

      {/* Poll results chart */}
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

      {/* Voted users table */}
      <Card className="shadow-card border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-500" />
            Voted ({voteDetails.length})
          </CardTitle>
          <Button size="sm" onClick={downloadVoted}>Download</Button>
        </CardHeader>
        <CardContent>
          {voteDetails.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No votes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Hostel</TableHead>
                  <TableHead>Choice</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voteDetails.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{v.voter_name}</TableCell>
                    <TableCell className="capitalize">{v.gender}</TableCell>
                    <TableCell>{v.hostel}</TableCell>
                    <TableCell>
                      <Badge variant="default">{v.option_text}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.voted_at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Not voted users table */}
      <Card className="shadow-card border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserX className="w-5 h-5 text-destructive" />
            Not Voted ({notVotedUsers.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={downloadNotVoted}>Download</Button>
        </CardHeader>
        <CardContent>
          {notVotedUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Everyone has voted!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Hostel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notVotedUsers.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">{u.gender}</TableCell>
                    <TableCell>{u.gender === "female" ? u.hostel || "—" : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PollResults;
