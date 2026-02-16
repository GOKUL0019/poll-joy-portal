import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Vote, Users, BarChart3, LogOut, Shield } from "lucide-react";
import ManageUsers from "@/components/admin/ManageUsers";
import ManagePolls from "@/components/admin/ManagePolls";
import PollResults from "@/components/admin/PollResults";

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" /> Users
              </TabsTrigger>
              <TabsTrigger value="polls" className="gap-2">
                <Vote className="w-4 h-4" /> Polls
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-2">
                <BarChart3 className="w-4 h-4" /> Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <ManageUsers />
            </TabsContent>
            <TabsContent value="polls">
              <ManagePolls />
            </TabsContent>
            <TabsContent value="results">
              <PollResults />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
