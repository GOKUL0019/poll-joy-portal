import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Upload, Pencil, Check, X } from "lucide-react";
import * as XLSX from "xlsx";

interface AuthorizedEmail {
  id: string;
  email: string;
  phone: string;
  full_name: string | null;
  is_registered: boolean;
  gender: string;
  hostel: string | null;
  created_at: string;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<AuthorizedEmail[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("male");
  const [hostel, setHostel] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // ✅ ADD USER
  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !phone.trim()) return;

    setLoading(true);

    const { error } = await supabase.from("authorized_emails").insert({
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      full_name: fullName.trim() || null,
      gender,
      hostel: gender === "female" ? hostel || null : null,
      is_registered: false,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.code === "23505" ? "Email already exists" : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "User added 🎉" });
      setEmail(""); setPhone(""); setFullName(""); setGender("male"); setHostel("");
      loadUsers();
    }

    setLoading(false);
  };

  // ✅ DELETE USER
  const removeUser = async (id: string) => {
    await supabase.from("authorized_emails").delete().eq("id", id);
    toast({ title: "User removed" });
    loadUsers();
  };

  // ✅ START EDIT
  const startEdit = (user: AuthorizedEmail) => {
    setEditingId(user.id);
    setEditData({
      full_name: user.full_name || "",
      phone: user.phone,
      gender: user.gender,
      hostel: user.hostel || "",
    });
  };

  // ✅ SAVE EDIT
  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("authorized_emails")
      .update({
        full_name: editData.full_name || null,
        phone: editData.phone,
        gender: editData.gender,
        hostel: editData.gender === "female" ? editData.hostel : null,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User updated ✅" });
      setEditingId(null);
      loadUsers();
    }
  };

  const cancelEdit = () => setEditingId(null);

  // ✅ BULK UPLOAD
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const workbook = XLSX.read(event.target?.result, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      const formattedUsers = rows
        .filter(row => row.email && row.phone)
        .map(row => ({
          full_name: row.full_name?.toString().trim() || null,
          email: row.email.toString().trim().toLowerCase(),
          phone: row.phone.toString().trim(),
          gender: row.gender?.toLowerCase() || "male",
          hostel: row.gender?.toLowerCase() === "female" ? row.hostel || null : null,
          is_registered: false,
        }));

      const { error } = await supabase
        .from("authorized_emails")
        .upsert(formattedUsers, { onConflict: "email" });

      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Upload Successful 🎉", description: `${formattedUsers.length} users processed.` });
        loadUsers();
      }

      setUploading(false);
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">

      {/* ADD USER */}
      <Card>
        <CardHeader><CardTitle>Add Authorized User</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e)=>setFullName(e.target.value)} />
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>

            <div>
              <Label>Password (Phone)</Label>
              <Input required value={phone} onChange={(e)=>setPhone(e.target.value)} />
            </div>

            <div>
              <Label>Gender</Label>
              <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
              </RadioGroup>
            </div>

            <AnimatePresence>
              {gender === "female" && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                  <Label>Hostel</Label>
                  <Select value={hostel} onValueChange={setHostel}>
                    <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kaveri">Kaveri</SelectItem>
                      <SelectItem value="amaravathi">Amaravathi</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="lg:col-span-3">
              <Button type="submit" disabled={loading}>
                <Plus className="w-4 h-4 mr-1"/> Add User
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* BULK UPLOAD */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5"/> Bulk Upload</CardTitle></CardHeader>
        <CardContent>
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} />
          {uploading && <p className="text-sm mt-2">Uploading...</p>}
        </CardContent>
      </Card>

      {/* USERS TABLE */}
      <Card>
        <CardHeader><CardTitle>Authorized Users ({users.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {users.map((u,i)=>{
                const editing = editingId === u.id;
                return (
                  <motion.tr key={u.id} initial={{opacity:0}} animate={{opacity:1}}>
                    <TableCell>
                      {editing ? (
                        <Input value={editData.full_name}
                          onChange={(e)=>setEditData({...editData, full_name:e.target.value})}/>
                      ) : (u.full_name || "—")}
                    </TableCell>

                    <TableCell>{u.email}</TableCell>

                    <TableCell>
                      {editing ? (
                        <Select value={editData.gender}
                          onValueChange={(val)=>setEditData({...editData, gender:val})}>
                          <SelectTrigger className="w-28"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : <span className="capitalize">{u.gender}</span>}
                    </TableCell>

                    <TableCell>
                      {editing && editData.gender==="female" ? (
                        <Select value={editData.hostel}
                          onValueChange={(val)=>setEditData({...editData, hostel:val})}>
                          <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kaveri">Kaveri</SelectItem>
                            <SelectItem value="amaravathi">Amaravathi</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : u.gender==="female" ? (u.hostel || "—") : "—"}
                    </TableCell>

                    <TableCell>
                      <Badge variant={u.is_registered?"default":"secondary"}>
                        {u.is_registered?"Registered":"Pending"}
                      </Badge>
                    </TableCell>

                    <TableCell className="flex gap-2">
                      {editing ? (
                        <>
                          <Button size="icon" onClick={()=>saveEdit(u.id)}><Check className="w-4 h-4"/></Button>
                          <Button size="icon" variant="ghost" onClick={cancelEdit}><X className="w-4 h-4"/></Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={()=>startEdit(u)}>
                            <Pencil className="w-4 h-4"/>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={()=>removeUser(u.id)}>
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>

          </Table>
        </CardContent>
      </Card>
    </div>
  );
}