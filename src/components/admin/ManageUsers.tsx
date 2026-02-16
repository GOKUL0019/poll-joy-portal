import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Plus, Trash2, UserPlus } from "lucide-react";

interface AuthorizedEmail {
  id: string;
  email: string;
  phone: string;
  full_name: string | null;
  is_registered: boolean;
  created_at: string;
}

const ManageUsers = () => {
  const [users, setUsers] = useState<AuthorizedEmail[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("authorized_emails")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !phone.trim()) return;
    setLoading(true);

    const { error } = await supabase.from("authorized_emails").insert({
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      full_name: fullName.trim() || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.code === "23505" ? "Email already exists" : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "User added", description: `${email} has been authorized.` });
      setEmail("");
      setPhone("");
      setFullName("");
      loadUsers();
    }
    setLoading(false);
  };

  const removeUser = async (id: string, userEmail: string) => {
    const { error } = await supabase.from("authorized_emails").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Removed", description: `${userEmail} has been removed.` });
      loadUsers();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent" />
            Add Authorized User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addUser} className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Phone (Password)</Label>
              <Input
                placeholder="1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full gradient-accent text-accent-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg">
            Authorized Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b"
                    >
                      <TableCell>{u.full_name || "—"}</TableCell>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>{u.phone}</TableCell>
                      <TableCell>
                        <Badge variant={u.is_registered ? "default" : "secondary"}>
                          {u.is_registered ? "Registered" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeUser(u.id, u.email)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageUsers;
