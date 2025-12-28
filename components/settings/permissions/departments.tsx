import React, { FC, useRef } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import {
  IconChevronDown,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import Btn from "@/components/button";
import { workspacestate } from "@/state";
import { useRecoilState } from "recoil";
import { useRouter } from "next/router";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import clsx from "clsx";

export interface Department {
  id: string;
  name: string;
  color: string | null;
  workspaceGroupId: number;
  createdAt: string;
  updatedAt: string;
}

type Props = {
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  departments: Department[];
};

const DepartmentsManager: FC<Props> = ({ departments, setDepartments }) => {
  const [workspace] = useRecoilState(workspacestate);
  const router = useRouter();
  const saveTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const newDepartment = async () => {
    const res = await axios.post(
      `/api/workspace/${workspace.groupId}/settings/departments/new`,
      {}
    );
    if (res.status === 200) {
      setDepartments([...departments, res.data.department]);
      toast.success("New department created");
    }
  };

  const updateDepartment = async (value: string, id: string) => {
    const index = departments.findIndex((dept: any) => dept.id === id);
    if (index === -1) return;
    const rdepartments = Object.assign([] as typeof departments, departments);

    rdepartments[index].name = value;
    setDepartments(rdepartments);
    
    // Debounce the save
    if (saveTimeouts.current[id]) {
      clearTimeout(saveTimeouts.current[id]);
    }
    saveTimeouts.current[id] = setTimeout(() => {
      saveDepartment(id);
    }, 1000);
  };

  const updateDepartmentColor = async (color: string, id: string) => {
    const index = departments.findIndex((dept: any) => dept.id === id);
    if (index === -1) return;
    const rdepartments = Object.assign([] as typeof departments, departments);
    rdepartments[index].color = color;
    setDepartments(rdepartments);
    
    // Debounce the save
    if (saveTimeouts.current[id]) {
      clearTimeout(saveTimeouts.current[id]);
    }
    saveTimeouts.current[id] = setTimeout(() => {
      saveDepartment(id);
    }, 1000);
  };

  const saveDepartment = async (id: string) => {
    const index = departments.findIndex((d: any) => d.id === id);
    if (index === -1) return;
    const payload = {
      name: departments[index].name,
      color: departments[index].color,
    };
    try {
      await axios.post(
        `/api/workspace/${workspace.groupId}/settings/departments/${id}/update`,
        payload
      );
      toast.success("Department saved!");
    } catch (e) {
      toast.error("Failed to save department.");
    }
  };

  const deleteDepartment = async (id: string) => {
    const res = axios
      .post(`/api/workspace/${workspace.groupId}/settings/departments/${id}/delete`)
      .then(() => {
        router.reload();
      });
    toast.promise(res, {
      loading: "Deleting department...",
      success: "Department deleted!",
      error: "Error deleting department",
    });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
          Departments
        </h3>
        <div className="flex items-center space-x-3">
          <button
            onClick={newDepartment}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
          >
            <IconPlus className="w-4 h-4 mr-1.5" />
            New Department
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {departments.map((department) => (
          <Disclosure
            as="div"
            key={department.id}
            className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-sm"
          >
            {({ open }) => (
              <>
                <Disclosure.Button className="w-full px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {department.name}
                      </span>
                    </div>
                    <IconChevronDown
                      className={clsx(
                        "w-5 h-5 text-zinc-500 transition-transform",
                        open ? "transform rotate-180" : ""
                      )}
                    />
                  </div>
                </Disclosure.Button>

                <Transition
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <Disclosure.Panel className="px-4 pb-4">
                    <div className="space-y-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Department name"
                          value={department.name}
                          onChange={(e) => updateDepartment(e.target.value, department.id)}
                          className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                          Department Color
                        </h4>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            className="w-12 h-8 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                            value={department.color || "#6b7280"}
                            onChange={(e) => updateDepartmentColor(e.target.value, department.id)}
                          />
                          <input
                            type="text"
                            className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={department.color || "#6b7280"}
                            onChange={(e) => updateDepartmentColor(e.target.value, department.id)}
                            placeholder="#6b7280"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveDepartment(department.id)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => deleteDepartment(department.id)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors"
                        >
                          <IconTrash size={16} className="mr-1.5" />
                          Delete Department
                        </button>
                      </div>
                    </div>
                  </Disclosure.Panel>
                </Transition>
              </>
            )}
          </Disclosure>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          <p>No departments created yet.</p>
          <p className="text-sm mt-1">Click "New Department" to get started.</p>
        </div>
      )}

    </div>
  );
};

export default DepartmentsManager;