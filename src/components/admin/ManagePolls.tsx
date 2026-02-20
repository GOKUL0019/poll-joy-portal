import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Poll {
  id: string;
  question: string;
  poll_date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function ManagePolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [question, setQuestion] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [editing, setEditing] = useState<Poll | null>(null);

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    const { data } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    setPolls(data || []);
  };

  const loadOptions = async (pollId: string) => {
    const { data } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", pollId)
      .order("sort_order");

    setOptions(data?.map(o => o.option_text) || ["", ""]);
  };

  const addOption = () => setOptions([...options, ""]);

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, value: string) => {
    const updated = [...options];
    updated[i] = value;
    setOptions(updated);
  };

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setEditing(null);
  };

  const createPoll = async (e: any) => {
    e.preventDefault();

    const valid = options.filter(o => o.trim());
    if (!question || valid.length < 2) {
      toast({ title: "Enter question & 2 options" });
      return;
    }

    const { data: poll } = await supabase
      .from("polls")
      .insert({
        question,
        poll_date: date,
        start_time: start,
        end_time: end,
      })
      .select()
      .single();

    const optionRows = valid.map((o, i) => ({
      poll_id: poll.id,
      option_text: o,
      sort_order: i,
    }));

    await supabase.from("poll_options").insert(optionRows);

    toast({ title: "Poll created!" });
    resetForm();
    loadPolls();
  };

  const startEdit = async (poll: Poll) => {
    setEditing(poll);
    setQuestion(poll.question);
    setDate(poll.poll_date);
    setStart(poll.start_time);
    setEnd(poll.end_time);
    loadOptions(poll.id);
  };

  const updatePoll = async (e: any) => {
    e.preventDefault();
    if (!editing) return;

    const valid = options.filter(o => o.trim());

    await supabase
      .from("polls")
      .update({
        question,
        poll_date: date,
        start_time: start,
        end_time: end,
      })
      .eq("id", editing.id);

    await supabase.from("poll_options")
      .delete()
      .eq("poll_id", editing.id);

    const optionRows = valid.map((o, i) => ({
      poll_id: editing.id,
      option_text: o,
      sort_order: i,
    }));

    await supabase.from("poll_options").insert(optionRows);

    toast({ title: "Poll updated!" });
    resetForm();
    loadPolls();
  };

  const deletePoll = async (id: string) => {
    if (!confirm("Delete poll?")) return;
    await supabase.from("polls").delete().eq("id", id);
    loadPolls();
  };

  const toggleActive = async (poll: Poll) => {
    await supabase
      .from("polls")
      .update({ is_active: !poll.is_active })
      .eq("id", poll.id);

    loadPolls();
  };

  return (
    <div className="space-y-6">

      {/* CREATE / EDIT */}
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit Poll" : "Create Poll"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={editing ? updatePoll : createPoll} className="space-y-4">

            <Input
              placeholder="Poll Question"
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />

            <div className="grid grid-cols-3 gap-3">
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <Input type="time" value={start} onChange={e => setStart(e.target.value)} />
              <Input type="time" value={end} onChange={e => setEnd(e.target.value)} />
            </div>

            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={opt}
                  placeholder={`Option ${i+1}`}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
                {options.length > 2 && (
                  <Button type="button" onClick={() => removeOption(i)}>
                    <X size={16}/>
                  </Button>
                )}
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addOption}>
              <Plus size={16}/> Add Option
            </Button>

            <Button type="submit">
              {editing ? "Update Poll" : "Create Poll"}
            </Button>

          </form>
        </CardContent>
      </Card>

      {/* POLL LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Polls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {polls.map(p => (
            <div key={p.id} className="flex justify-between items-center border p-3 rounded-lg">
              <div>
                <p className="font-semibold">{p.question}</p>
                <p className="text-sm text-gray-500">{p.poll_date}</p>
              </div>

              <div className="flex gap-2 items-center">
                <Button size="sm" onClick={() => startEdit(p)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => deletePoll(p.id)}>Delete</Button>
                <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}
