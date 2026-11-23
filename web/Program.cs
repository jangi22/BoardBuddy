using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace BoardBuddyLauncher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            string url = "http://localhost:3000";
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string projectDir = @"C:\Users\CHAD\Downloads\boardbuddy113-20261123T024257Z-1-001\boardbuddy113";

            // If projectDir doesn't exist at default location, look relative to the executable
            if (!Directory.Exists(projectDir))
            {
                if (File.Exists(Path.Combine(baseDir, "BoardBuddy-Server.exe")) || File.Exists(Path.Combine(baseDir, "package.json")))
                {
                    projectDir = baseDir;
                }
                else if (Directory.Exists(Path.Combine(baseDir, "boardbuddy113")))
                {
                    projectDir = Path.Combine(baseDir, "boardbuddy113");
                }
            }

            // Check if server is already running
            bool isRunning = IsServerRunning(url);

            if (!isRunning)
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.WorkingDirectory = projectDir;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;

                    // Prefer compiled standalone server if present
                    string serverExe = Path.Combine(projectDir, "BoardBuddy-Server.exe");
                    if (!File.Exists(serverExe) && File.Exists(Path.Combine(baseDir, "BoardBuddy-Server.exe")))
                    {
                        serverExe = Path.Combine(baseDir, "BoardBuddy-Server.exe");
                        psi.WorkingDirectory = baseDir;
                    }

                    if (File.Exists(serverExe))
                    {
                        psi.FileName = serverExe;
                        psi.EnvironmentVariables["NODE_ENV"] = "production";
                    }
                    else
                    {
                        psi.FileName = "cmd.exe";
                        psi.Arguments = "/c bun run dev || npm run dev";
                    }

                    Process.Start(psi);

                    // Wait for server to respond (up to 15 seconds)
                    for (int i = 0; i < 30; i++)
                    {
                        Thread.Sleep(500);
                        if (IsServerRunning(url))
                        {
                            isRunning = true;
                            break;
                        }
                    }
                }
                catch (Exception)
                {
                    // Continue to browser launch
                }
            }

            // Launch desktop window in Chromium App mode (clean borderless desktop app experience)
            bool launchedInAppMode = false;

            // Search Chrome
            string chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe");
            if (!File.Exists(chromePath))
            {
                chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe");
            }
            if (!File.Exists(chromePath))
            {
                chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe");
            }

            // Search Edge
            string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
            if (!File.Exists(edgePath))
            {
                edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");
            }

            string browserPath = File.Exists(chromePath) ? chromePath : (File.Exists(edgePath) ? edgePath : null);

            if (browserPath != null)
            {
                try
                {
                    ProcessStartInfo appPsi = new ProcessStartInfo();
                    appPsi.FileName = browserPath;
                    appPsi.Arguments = "--app=" + url;
                    Process.Start(appPsi);
                    launchedInAppMode = true;
                }
                catch (Exception)
                {
                    launchedInAppMode = false;
                }
            }

            if (!launchedInAppMode)
            {
                try
                {
                    Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Could not open BoardBuddy: " + ex.Message, "BoardBuddy", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }

        static bool IsServerRunning(string url)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = 1200;
                req.Method = "GET";
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }
    }
}
